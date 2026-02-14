import { NextRequest, NextResponse } from "next/server";
import { PrismaClient as GPPrismaClient } from "@/generated/gp";

const gpPrisma = new GPPrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const itemNumber = searchParams.get("itemNumber");
        const viewMode = searchParams.get("viewMode") || "item"; // 'item' or 'sn'
        const q = searchParams.get("q") || ""; // Secondary search within mode
        const classIds = searchParams.get("classIds")?.split(",").filter(Boolean) || [];
        const siteId = searchParams.get("siteId") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        let sql = "";
        const params: any[] = [];
        let paramIndex = 1;

        let baseSql = "";
        const whereIV = ["1=1"];
        const wherePOP = ["1=1"];
        const whereSOP = ["1=1"];
        const internalParams: any[] = [];
        let internalParamIndex = paramIndex;

        if (itemNumber) {
            const pVal = itemNumber.padEnd(20);
            whereIV.push(`h.ITEMNMBR = @P${internalParamIndex}`);
            wherePOP.push(`l.ITEMNMBR = @P${internalParamIndex}`);
            whereSOP.push(`l.ITEMNMBR = @P${internalParamIndex}`);
            params.push(pVal);
            internalParamIndex++;
        }

        if (q) {
            const pIdx = internalParamIndex++;
            params.push(`${q.trim()}%`); // Prefix search is index friendly
            whereIV.push(`(h.DOCNUMBR LIKE @P${pIdx} OR s.SERLTNUM LIKE @P${pIdx})`);
            wherePOP.push(`(h.POPRCTNM LIKE @P${pIdx} OR s.SERLTNUM LIKE @P${pIdx})`);
            whereSOP.push(`(h.SOPNUMBE LIKE @P${pIdx} OR s.SERLTNUM LIKE @P${pIdx})`);
        }

        if (siteId && siteId !== "ALL") {
            const sVal = siteId.padEnd(10);
            whereIV.push(`(h.TRXLOCTN = @P${internalParamIndex} OR h.TRNSTLOC = @P${internalParamIndex})`);
            wherePOP.push(`l.LOCNCODE = @P${internalParamIndex}`);
            whereSOP.push(`l.LOCNCODE = @P${internalParamIndex}`);
            params.push(sVal);
            internalParamIndex++;
        }

        // Update global paramIndex for subsequent pagination
        paramIndex = internalParamIndex;

        if (viewMode === "item") {
            baseSql = `
                SELECT 
                    RTRIM(h.ITEMNMBR) as ITEMNMBR,
                    RTRIM(i.ITEMDESC) as ITEMDESC,
                    RTRIM(i.ITMCLSCD) as CLASS_ID,
                    h.DOCDATE as POSTING_DATE,
                    RTRIM(h.DOCNUMBR) as DOC_NUMBER,
                    h.DOCTYPE,
                    RTRIM(h.TRXSORCE) as TRX_SOURCE,
                    CASE 
                        WHEN h.DOCTYPE = 3 THEN 'Transfer'
                        WHEN h.DOCNUMBR LIKE '%INV%' THEN 'Sales'
                        WHEN h.DOCNUMBR LIKE '%RET%' OR h.DOCTYPE = 6 THEN 'Return'
                        WHEN h.DOCTYPE = 5 THEN 'Receipt'
                        WHEN h.DOCTYPE IN (1, 2) THEN 'Adjustment'
                        ELSE 'Other'
                    END as MOVEMENT_TYPE_RAW,
                    h.TRXQTY as QTY,
                    RTRIM(h.TRXLOCTN) as TRXLOCTN,
                    RTRIM(h.TRNSTLOC) as TRNSTLOC,
                    'IV' as MODULE_CODE,
                    h.DEX_ROW_ID
                FROM IV30300 h
                INNER JOIN IV00101 i ON h.ITEMNMBR = i.ITEMNMBR
                WHERE ${whereIV.join(" AND ")}
            `;
        } else {
            baseSql = `
                SELECT 
                    RTRIM(h.ITEMNMBR) as ITEMNMBR,
                    RTRIM(i.ITEMDESC) as ITEMDESC,
                    RTRIM(i.ITMCLSCD) as CLASS_ID,
                    h.DOCDATE as POSTING_DATE,
                    RTRIM(h.DOCNUMBR) as DOC_NUMBER,
                    h.DOCTYPE,
                    RTRIM(h.TRXSORCE) as TRX_SOURCE,
                    RTRIM(s.SERLTNUM) as SERIAL_NUMBER,
                    CASE 
                        WHEN h.DOCTYPE = 3 THEN 'Transfer'
                        WHEN h.DOCNUMBR LIKE '%INV%' THEN 'Sales'
                        WHEN h.DOCNUMBR LIKE '%RET%' OR h.DOCTYPE = 6 THEN 'Return'
                        WHEN h.DOCTYPE = 5 THEN 'Receipt'
                        WHEN h.DOCTYPE IN (1, 2) THEN 'Adjustment'
                        ELSE 'Other'
                    END as MOVEMENT_TYPE_RAW,
                    1.0 as QTY,
                    RTRIM(h.TRXLOCTN) as TRXLOCTN,
                    RTRIM(h.TRNSTLOC) as TRNSTLOC,
                    'IV' as MODULE_CODE,
                    h.DEX_ROW_ID
                FROM IV30400 s
                INNER JOIN IV30300 h ON s.DOCNUMBR = h.DOCNUMBR AND s.ITEMNMBR = h.ITEMNMBR AND s.IVDOCTYP = h.DOCTYPE AND s.LNSEQNBR = h.LNSEQNBR
                INNER JOIN IV00101 i ON h.ITEMNMBR = i.ITEMNMBR
                WHERE ${whereIV.join(" AND ")}
                
                UNION ALL
                
                SELECT 
                    RTRIM(l.ITEMNMBR) as ITEMNMBR,
                    RTRIM(i.ITEMDESC) as ITEMDESC,
                    RTRIM(i.ITMCLSCD) as CLASS_ID,
                    h.receiptdate as POSTING_DATE,
                    RTRIM(h.POPRCTNM) as DOC_NUMBER,
                    h.POPTYPE as DOCTYPE,
                    RTRIM(h.TRXSORCE) as TRX_SOURCE,
                    RTRIM(s.SERLTNUM) as SERIAL_NUMBER,
                    'Receipt' as MOVEMENT_TYPE_RAW,
                    1.0 as QTY,
                    RTRIM(l.LOCNCODE) as TRXLOCTN,
                    '' as TRNSTLOC,
                    'POP' as MODULE_CODE,
                    h.DEX_ROW_ID
                FROM POP30330 s
                INNER JOIN POP30310 l ON s.POPRCTNM = l.POPRCTNM AND s.RCPTLNNM = l.RCPTLNNM
                INNER JOIN POP30300 h ON s.POPRCTNM = h.POPRCTNM
                INNER JOIN IV00101 i ON l.ITEMNMBR = i.ITEMNMBR
                WHERE ${wherePOP.join(" AND ")}
                
                UNION ALL
                
                SELECT 
                    RTRIM(l.ITEMNMBR) as ITEMNMBR,
                    RTRIM(i.ITEMDESC) as ITEMDESC,
                    RTRIM(i.ITMCLSCD) as CLASS_ID,
                    h.DOCDATE as POSTING_DATE,
                    RTRIM(h.SOPNUMBE) as DOC_NUMBER,
                    h.SOPTYPE as DOCTYPE,
                    RTRIM(h.TRXSORCE) as TRX_SOURCE,
                    RTRIM(s.SERLTNUM) as SERIAL_NUMBER,
                    CASE WHEN h.SOPTYPE = 4 THEN 'Return' ELSE 'Sales' END as MOVEMENT_TYPE_RAW,
                    -1.0 as QTY,
                    RTRIM(l.LOCNCODE) as TRXLOCTN,
                    '' as TRNSTLOC,
                    'SOP' as MODULE_CODE,
                    h.DEX_ROW_ID
                FROM SOP10201 s
                INNER JOIN SOP30300 l ON s.SOPNUMBE = l.SOPNUMBE AND s.SOPTYPE = l.SOPTYPE AND s.LNITMSEQ = l.LNITMSEQ
                INNER JOIN SOP30200 h ON s.SOPNUMBE = h.SOPNUMBE AND s.SOPTYPE = h.SOPTYPE
                INNER JOIN IV00101 i ON l.ITEMNMBR = i.ITEMNMBR
                WHERE ${whereSOP.join(" AND ")}
            `;
        }

        // Final query wrapped for consistent presentation logic
        sql = `SELECT * FROM (${baseSql}) as h WHERE 1=1`;

        if (classIds.length > 0) {
            const classPlaceholders = classIds.map((_, i) => `@P${paramIndex + i}`).join(",");
            sql += ` AND h.CLASS_ID IN (${classPlaceholders})`;
            params.push(...classIds);
            paramIndex += classIds.length;
        }

        // Wrap to apply From/To Site and final Movement Type logic
        const wrappedSql = `
            SELECT 
                inner_base.*,
                CASE
                    WHEN MOVEMENT_TYPE_RAW = 'Adjustment' AND FROM_SITE = '' AND TO_SITE <> '' THEN 'Receipt'
                    WHEN MOVEMENT_TYPE_RAW = 'Other' AND QTY > 0 THEN 'Receipt'
                    ELSE MOVEMENT_TYPE_RAW
                END as MOVEMENT_TYPE,
                CASE 
                    WHEN TRX_SOURCE LIKE 'RECV%' THEN 'Receivings Transaction Entry'
                    WHEN TRX_SOURCE LIKE 'IVTR%' OR TRX_SOURCE LIKE 'IVTF%' THEN 'Inventory Transfer Entry'
                    WHEN TRX_SOURCE LIKE 'IVAD%' THEN 'Inventory Adjustment Entry'
                    WHEN TRX_SOURCE LIKE 'SALE%' THEN 'Sales Transaction Entry'
                    WHEN TRX_SOURCE LIKE 'SLSR%' THEN 'Sales Return Entry'
                    ELSE TRX_SOURCE
                END as SOURCE_DISPLAY,
                CASE
                    WHEN '${siteId}' = '' OR '${siteId}' = 'ALL' THEN
                        CASE WHEN MOVEMENT_TYPE_RAW = 'Transfer' THEN 0 ELSE QTY END
                    ELSE
                        CASE 
                            WHEN MOVEMENT_TYPE_RAW = 'Transfer' THEN
                                CASE 
                                    WHEN TRXLOCTN = '${siteId.padEnd(10)}' THEN -QTY
                                    WHEN TRNSTLOC = '${siteId.padEnd(10)}' THEN QTY
                                    ELSE 0
                                END
                            ELSE QTY
                        END
                END as BALANCE_EFFECT
            FROM (
                SELECT 
                    *,
                    CASE 
                        WHEN MOVEMENT_TYPE_RAW = 'Transfer' THEN TRXLOCTN
                        WHEN MOVEMENT_TYPE_RAW IN ('Sales', 'Return') AND QTY < 0 THEN TRXLOCTN
                        WHEN MOVEMENT_TYPE_RAW = 'Adjustment' AND QTY < 0 THEN TRXLOCTN
                        ELSE '' 
                    END as FROM_SITE,
                    CASE 
                        WHEN MOVEMENT_TYPE_RAW = 'Transfer' THEN TRNSTLOC
                        WHEN MOVEMENT_TYPE_RAW = 'Receipt' OR MOVEMENT_TYPE_RAW = 'Purchase' THEN TRXLOCTN
                        WHEN MOVEMENT_TYPE_RAW = 'Adjustment' AND QTY > 0 THEN TRXLOCTN
                        WHEN MOVEMENT_TYPE_RAW = 'Return' AND QTY > 0 THEN TRXLOCTN
                        ELSE ''
                    END as TO_SITE
                FROM (${sql}) as base
            ) as inner_base
        `;

        // Add Balance Calculation using Window Function
        const finalSqlWithBalance = `
            SELECT 
                *,
                SUM(BALANCE_EFFECT) OVER (ORDER BY POSTING_DATE ASC, MODULE_CODE ASC, DEX_ROW_ID ASC) as BALANCE_QTY
            FROM (${wrappedSql}) as enriched
        `;

        // DEBUG LOGGING
        console.log("INVENTORY TRACKING SEARCH:", { itemNumber, viewMode, q, classIds, siteId, page });

        // Get total count
        const countResult: any = await gpPrisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM (${finalSqlWithBalance}) as sub`, ...params);
        const total = countResult[0]?.total || 0;

        // Add order and pagination
        const paginatedSql = `
            SELECT * FROM (${finalSqlWithBalance}) as sorted
            ORDER BY POSTING_DATE DESC, DOC_NUMBER DESC 
            OFFSET @P${paramIndex} ROWS FETCH NEXT @P${paramIndex + 1} ROWS ONLY
        `;
        params.push(offset, limit);

        const items = await gpPrisma.$queryRawUnsafe(paginatedSql, ...params);

        return NextResponse.json({
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        console.error("Inventory Tracking API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
