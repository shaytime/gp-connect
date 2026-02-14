import { NextRequest, NextResponse } from "next/server";
import { PrismaClient as GPPrismaClient } from "@/generated/gp";

const gpPrisma = new GPPrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const itemNumber = searchParams.get("itemNumber");
        const siteId = searchParams.get("siteId");

        if (!itemNumber) {
            return NextResponse.json({ error: "Item Number is required" }, { status: 400 });
        }

        // 1. Get Tracking Option
        const itemInfo: any[] = await gpPrisma.$queryRawUnsafe(`
            SELECT ITMTRKOP FROM IV00101 WHERE RTRIM(ITEMNMBR) = @P1
        `, itemNumber.trim());

        const tracking = itemInfo[0]?.ITMTRKOP || 1;

        if (tracking === 2) {
            // Serialized - Original Logic
            const items = await gpPrisma.$queryRawUnsafe(`
                SELECT 
                    RTRIM(s.SERLNMBR) as SERLTNUM,
                    RTRIM(r.RCPTNMBR) as RCPTNMBR,
                    r.DATERECD,
                    DATEDIFF(day, r.DATERECD, GETDATE()) as DaysOld,
                    RTRIM(s.BIN) as BIN,
                    r.UNITCOST,
                    alloc.DOC_NUMBER as SOPNUMBE,
                    alloc.DOC_CUSTOMER as CUSTNAME
                FROM IV00200 s
                INNER JOIN IV10200 r ON s.ITEMNMBR = r.ITEMNMBR AND s.LOCNCODE = r.TRXLOCTN AND s.RCTSEQNM = r.RCTSEQNM
                OUTER APPLY (
                    SELECT TOP 1 
                        RTRIM(sh.SOPNUMBE) as DOC_NUMBER,
                        RTRIM(sh.CUSTNAME) as DOC_CUSTOMER
                    FROM SOP10201 sl
                    INNER JOIN SOP10100 sh ON sl.SOPNUMBE = sh.SOPNUMBE AND sl.SOPTYPE = sh.SOPTYPE
                    WHERE sl.ITEMNMBR = s.ITEMNMBR AND sl.SERLTNUM = s.SERLNMBR
                    AND sl.SOPTYPE IN (2, 3, 5) -- Order, Invoice, Back Order
                    
                    UNION ALL
                    
                    SELECT TOP 1
                        RTRIM(iv.IVDOCNBR) as DOC_NUMBER,
                        CASE 
                            WHEN iv.IVDOCTYP = 1 THEN 'ADJUSTMENT'
                            WHEN iv.IVDOCTYP = 2 THEN 'VARIANCE'
                            WHEN iv.IVDOCTYP = 3 THEN 'TRANSFER'
                            ELSE ''
                        END as DOC_CUSTOMER
                    FROM IV10002 iv
                    WHERE iv.ITEMNMBR = s.ITEMNMBR AND iv.SERLTNUM = s.SERLNMBR
                ) alloc
                WHERE RTRIM(s.ITEMNMBR) = @P1 AND RTRIM(s.LOCNCODE) = @P2 AND s.QTYTYPE = 1
                ORDER BY r.DATERECD ASC, s.SERLNMBR ASC
            `, itemNumber.trim(), siteId?.trim() || "");

            return NextResponse.json({ tracking, items });
        } else {
            // Non-serialized (Default or Lot tracked but user asked for non-serialized aging/alloc)
            // 2. Fetch Aging (Receipt Layers)
            const items = await gpPrisma.$queryRawUnsafe(`
                SELECT 
                    RTRIM(RCPTNMBR) as RCPTNMBR,
                    DATERECD,
                    DATEDIFF(day, DATERECD, GETDATE()) as DaysOld,
                    (QTYRECVD - QTYSOLD) as QTYAVAILABLE,
                    RTRIM(TRXLOCTN) as BIN
                FROM IV10200
                WHERE RTRIM(ITEMNMBR) = @P1 AND RTRIM(TRXLOCTN) = @P2 AND (QTYRECVD - QTYSOLD) > 0
                ORDER BY DATERECD ASC
            `, itemNumber.trim(), siteId?.trim() || "");

            // 3. Fetch Allocations
            const allocations = await gpPrisma.$queryRawUnsafe(`
                SELECT 
                    RTRIM(h.SOPNUMBE) as SOPNUMBE,
                    RTRIM(h.CUSTNAME) as CUSTNAME,
                    l.ATYALLOC,
                    l.QUANTITY,
                    h.DOCDATE
                FROM SOP10200 l
                INNER JOIN SOP10100 h ON l.SOPNUMBE = h.SOPNUMBE AND l.SOPTYPE = h.SOPTYPE
                WHERE RTRIM(l.ITEMNMBR) = @P1 AND RTRIM(l.LOCNCODE) = @P2 AND l.ATYALLOC > 0
                ORDER BY h.DOCDATE ASC
            `, itemNumber.trim(), siteId?.trim() || "");

            return NextResponse.json({ tracking, items, allocations });
        }
    } catch (error: any) {
        console.error("Inventory Detail API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
