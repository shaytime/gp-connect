"use server";

import { prismaGP, prismaApp } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import { cleanupExpiredReservations } from "../inventory/reservation-actions";
import { auth } from "@/auth";

export async function getCustomerDetails(customerId: string) {
    try {
        // 1. Get Customer Master & Address Codes
        const customerMaster = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT CUSTNMBR, CUSTNAME, PRBTADCD, PRSTADCD, PHONE1, CNTCPRSN 
             FROM RM00101 WHERE CUSTNMBR = @P1`,
            customerId
        );

        if (customerMaster.length === 0) return null;

        const customer = customerMaster[0];

        // 2. Get Bill-to and Ship-to Address details
        const addresses = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT ADRSCODE, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, COUNTRY 
             FROM RM00102 
             WHERE CUSTNMBR = @P1 AND (ADRSCODE = @P2 OR ADRSCODE = @P3)`,
            customerId,
            customer.PRBTADCD,
            customer.PRSTADCD
        );

        const billTo = addresses.find(a => a.ADRSCODE.trim() === customer.PRBTADCD.trim());
        const shipTo = addresses.find(a => a.ADRSCODE.trim() === customer.PRSTADCD.trim());

        // 3. Calculate Open AR and Overdue AR
        const arResult = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT 
                SUM(
                    CASE 
                        WHEN RMDTYPAL >= 7 THEN -CURTRXAM 
                        ELSE CURTRXAM 
                    END
                ) as TotalAR,
                SUM(
                    CASE 
                        WHEN RMDTYPAL < 7 AND DUEDATE < GETDATE() THEN CURTRXAM 
                        WHEN RMDTYPAL >= 7 AND DUEDATE < GETDATE() THEN -CURTRXAM
                        ELSE 0 
                    END
                ) as OverdueAR
             FROM RM20101 
             WHERE CUSTNMBR = @P1 AND VOIDSTTS = 0`,
            customerId
        );

        return {
            id: customer.CUSTNMBR.trim(),
            name: customer.CUSTNAME.trim(),
            contact: customer.CNTCPRSN.trim(),
            phone: customer.PHONE1.trim(),
            billTo: billTo ? {
                code: billTo.ADRSCODE.trim(),
                address1: billTo.ADDRESS1.trim(),
                address2: billTo.ADDRESS2.trim(),
                city: billTo.CITY.trim(),
                state: billTo.STATE.trim(),
                zip: billTo.ZIP.trim(),
                country: billTo.COUNTRY.trim()
            } : null,
            shipTo: shipTo ? {
                code: shipTo.ADRSCODE.trim(),
                address1: shipTo.ADDRESS1.trim(),
                address2: shipTo.ADDRESS2.trim(),
                city: shipTo.CITY.trim(),
                state: shipTo.STATE.trim(),
                zip: shipTo.ZIP.trim(),
                country: shipTo.COUNTRY.trim()
            } : null,
            openAR: Number(arResult[0]?.TotalAR || 0),
            overdueAR: Number(arResult[0]?.OverdueAR || 0)
        };
    } catch (error) {
        console.error("Error fetching customer details:", error);
        throw new Error("Failed to fetch customer details");
    }
}

export async function getARTransactions(customerId: string) {
    try {
        const transactions = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT DOCNUMBR, DOCDATE, DUEDATE, RMDTYPAL, ORTRXAMT, CURTRXAM 
             FROM RM20101 
             WHERE CUSTNMBR = @P1 AND VOIDSTTS = 0 AND CURTRXAM <> 0
             ORDER BY DOCDATE DESC`,
            customerId
        );

        const typeMapping: Record<number, string> = {
            1: "Invoice",
            3: "Debit Memo",
            4: "Finance Charge",
            5: "Service/Repair",
            6: "Warranty",
            7: "Credit Memo",
            8: "Return",
            9: "Payment"
        };

        return transactions.map(trx => ({
            docNumber: trx.DOCNUMBR.trim(),
            docDate: trx.DOCDATE,
            dueDate: trx.DUEDATE,
            type: typeMapping[trx.RMDTYPAL] || `Other (${trx.RMDTYPAL})`,
            originalAmount: Number(trx.ORTRXAMT),
            balance: Number(trx.CURTRXAM),
            isCredit: [7, 8, 9].includes(trx.RMDTYPAL)
        }));
    } catch (error) {
        console.error("Error fetching AR transactions:", error);
        throw new Error("Failed to fetch AR transactions");
    }
}

export async function getInvoiceDetails(docNumber: string) {
    try {
        // 1. Get Invoice Header (Historical)
        const headerResult = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT SOPNUMBE, DOCDATE, SUBTOTAL, FRTAMNT, TAXAMNT, DOCAMNT, CUSTNAME, CSTPONBR,
                    SHIPMTHD, PYMTRMID, ADDRESS1, ADDRESS2, CITY, STATE, ZIPCODE, COUNTRY, CNTCPRSN,
                    LOCNCODE, TRDISAMT
             FROM SOP30200 WHERE SOPNUMBE = @P1`,
            docNumber
        );

        if (headerResult.length === 0) return null;

        const header = headerResult[0];

        // 2. Get Invoice Line Items
        const lines = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT ITEMNMBR, ITEMDESC, UNITPRCE, XTNDPRCE, QUANTITY, UOFM, LNITMSEQ
             FROM SOP30300 WHERE SOPNUMBE = @P1
             ORDER BY LNITMSEQ`,
            docNumber
        );

        // 3. Get Serial Numbers (from SOP10201)
        const serials = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT LNITMSEQ, SERLTNUM 
             FROM SOP10201 
             WHERE SOPNUMBE = @P1`,
            docNumber
        );

        // Group serial numbers by LNITMSEQ
        const serialMap: Record<number, string[]> = {};
        serials.forEach(s => {
            const seq = Number(s.LNITMSEQ);
            if (!serialMap[seq]) serialMap[seq] = [];
            serialMap[seq].push((s.SERLTNUM || "").trim());
        });

        return {
            header: {
                sopNumber: (header.SOPNUMBE || "").trim(),
                docDate: header.DOCDATE,
                customerName: (header.CUSTNAME || "").trim(),
                poNumber: (header.CSTPONBR || "").trim(),
                subtotal: Number(header.SUBTOTAL || 0),
                tradeDiscount: Number(header.TRDISAMT || 0),
                freight: Number(header.FRTAMNT || 0),
                tax: Number(header.TAXAMNT || 0),
                total: Number(header.DOCAMNT || 0),
                shippingMethod: (header.SHIPMTHD || "").trim(),
                paymentTerms: (header.PYMTRMID || "").trim(),
                siteId: (header.LOCNCODE || "").trim(),
                shipTo: {
                    contact: (header.CNTCPRSN || "").trim(),
                    address1: (header.ADDRESS1 || "").trim(),
                    address2: (header.ADDRESS2 || "").trim(),
                    city: (header.CITY || "").trim(),
                    state: (header.STATE || "").trim(),
                    zip: (header.ZIPCODE || "").trim(),
                    country: (header.COUNTRY || "").trim()
                }
            },
            lines: lines.map(line => ({
                itemNumber: (line.ITEMNMBR || "").trim(),
                description: (line.ITEMDESC || "").trim(),
                unitPrice: Number(line.UNITPRCE || 0),
                extendedPrice: Number(line.XTNDPRCE || 0),
                quantity: Number(line.QUANTITY || 0),
                uom: (line.UOFM || "").trim(),
                serialNumbers: serialMap[Number(line.LNITMSEQ)] || []
            }))
        };
    } catch (error) {
        console.error("Error fetching invoice details:", error);
        throw new Error("Failed to fetch invoice details");
    }
}

export async function getInvoices(params: {
    q?: string;
    page?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
    modality?: string;
    type?: string;
}) {
    try {
        const { q = "", page = 1, sort = "date", order = "DESC", modality = "all", type = "all" } = params;
        const itemsPerPage = 15;
        const skip = (page - 1) * itemsPerPage;

        const sortMapping: Record<string, string> = {
            doc: 'SOPNUMBE',
            modality: `CASE 
                WHEN SOPNUMBE LIKE 'USINV%' THEN 1 
                WHEN SOPNUMBE LIKE 'DRINV%' THEN 2 
                WHEN SOPNUMBE LIKE 'CTINV%' THEN 3 
                ELSE 4 END`,
            type: `CASE WHEN LOCNCODE LIKE '%F.S%' OR LOCNCODE LIKE '%STOCK%' OR LOCNCODE LIKE '%CAL%' THEN 2 ELSE 1 END`,
            date: 'DOCDATE',
            due: 'DUEDATE',
            customer: 'CUSTNAME',
            amount: 'DOCAMNT'
        };
        const orderBy = sortMapping[sort] || 'DOCDATE';

        let whereClause = `WHERE SOPTYPE = 3`;
        const queryParams: any[] = [];
        let pIndex = 1;

        if (q.trim()) {
            whereClause += ` AND (SOPNUMBE LIKE @P${pIndex} OR CUSTNAME LIKE @P${pIndex})`;
            queryParams.push(`%${q.trim()}%`);
            pIndex++;
        }

        if (modality !== "all") {
            const prefix = modality === "US" ? "USINV" : modality === "DR" ? "DRINV" : "CTINV";
            whereClause += ` AND SOPNUMBE LIKE @P${pIndex}`;
            queryParams.push(`${prefix}%`);
            pIndex++;
        }

        if (type !== "all") {
            if (type === "service") {
                whereClause += ` AND (LOCNCODE LIKE '%F.S%' OR LOCNCODE LIKE '%STOCK%' OR LOCNCODE LIKE '%CAL%')`;
            } else {
                whereClause += ` AND LOCNCODE NOT LIKE '%F.S%' AND LOCNCODE NOT LIKE '%STOCK%' AND LOCNCODE NOT LIKE '%CAL%'`;
            }
        }

        const [countResult, results] = await Promise.all([
            prismaGP.$queryRawUnsafe<{ count: number }[]>(
                `SELECT COUNT(*) as count FROM SOP30200 ${whereClause}`,
                ...queryParams
            ),
            prismaGP.$queryRawUnsafe<any[]>(
                `SELECT SOPNUMBE, DOCDATE, DUEDATE, CUSTNAME, DOCAMNT, ADDRESS1, CITY, STATE, CNTCPRSN, LOCNCODE 
                 FROM SOP30200 
                 ${whereClause} 
                 ORDER BY ${orderBy} ${order}
                 OFFSET ${skip} ROWS FETCH NEXT ${itemsPerPage} ROWS ONLY`,
                ...queryParams
            )
        ]);

        const getModality = (docNum: string) => {
            if (docNum.startsWith("USINV")) return "US";
            if (docNum.startsWith("DRINV")) return "DR";
            if (docNum.startsWith("CTINV")) return "mCT";
            return "Other";
        };

        const getInvoiceType = (siteId: string) => {
            const sid = (siteId || "").toUpperCase();
            return (sid.includes("F.S") || sid.includes("STOCK") || sid.includes("CAL")) ? "Service" : "Sales";
        };

        return {
            invoices: results.map(inv => ({
                sopNumber: inv.SOPNUMBE.trim(),
                docDate: inv.DOCDATE,
                dueDate: inv.DUEDATE,
                customerName: inv.CUSTNAME.trim(),
                totalAmount: Number(inv.DOCAMNT),
                modality: getModality(inv.SOPNUMBE.trim()),
                type: getInvoiceType(inv.LOCNCODE || ""),
                shipTo: {
                    name: (inv.CNTCPRSN || "").trim(),
                    address1: (inv.ADDRESS1 || "").trim(),
                    city: (inv.CITY || "").trim(),
                    state: (inv.STATE || "").trim()
                }
            })),
            totalItems: Number(countResult[0]?.count || 0),
            itemsPerPage
        };
    } catch (error) {
        console.error("Error fetching invoices:", error);
        throw new Error("Failed to fetch invoices");
    }
}

export async function getAllInvoicesForExport(params: {
    q?: string;
    sort?: string;
    order?: 'ASC' | 'DESC';
    modality?: string;
    type?: string;
}) {
    try {
        const { q = "", sort = "date", order = "DESC", modality = "all", type = "all" } = params;

        const sortMapping: Record<string, string> = {
            doc: 'SOPNUMBE',
            date: 'DOCDATE',
            due: 'DUEDATE',
            customer: 'CUSTNAME',
            amount: 'DOCAMNT'
        };
        const orderBy = sortMapping[sort] || 'DOCDATE';

        let whereClause = `WHERE SOPTYPE = 3`;
        const queryParams: any[] = [];
        let pIndex = 1;

        if (q.trim()) {
            whereClause += ` AND (SOPNUMBE LIKE @P${pIndex} OR CUSTNAME LIKE @P${pIndex})`;
            queryParams.push(`%${q.trim()}%`);
            pIndex++;
        }

        if (modality !== "all") {
            const prefix = modality === "US" ? "USINV" : modality === "DR" ? "DRINV" : "CTINV";
            whereClause += ` AND SOPNUMBE LIKE @P${pIndex}`;
            queryParams.push(`${prefix}%`);
            pIndex++;
        }

        if (type !== "all") {
            if (type === "service") {
                whereClause += ` AND (LOCNCODE LIKE '%F.S%' OR LOCNCODE LIKE '%STOCK%' OR LOCNCODE LIKE '%CAL%')`;
            } else {
                whereClause += ` AND LOCNCODE NOT LIKE '%F.S%' AND LOCNCODE NOT LIKE '%STOCK%' AND LOCNCODE NOT LIKE '%CAL%'`;
            }
        }

        const results = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT SOPNUMBE, DOCDATE, DUEDATE, CUSTNAME, DOCAMNT, ADDRESS1, CITY, STATE, CNTCPRSN, LOCNCODE 
             FROM SOP30200 
             ${whereClause} 
             ORDER BY ${orderBy} ${order}`,
            ...queryParams
        );

        const getModality = (docNum: string) => {
            if (docNum.startsWith("USINV")) return "US";
            if (docNum.startsWith("DRINV")) return "DR";
            if (docNum.startsWith("CTINV")) return "mCT";
            return "Other";
        };

        const getInvoiceType = (siteId: string) => {
            const sid = (siteId || "").toUpperCase();
            return (sid.includes("F.S") || sid.includes("STOCK") || sid.includes("CAL")) ? "Service" : "Sales";
        };

        return results.map(inv => ({
            sopNumber: inv.SOPNUMBE.trim(),
            docDate: inv.DOCDATE,
            dueDate: inv.DUEDATE,
            customerName: inv.CUSTNAME.trim(),
            totalAmount: Number(inv.DOCAMNT),
            modality: getModality(inv.SOPNUMBE.trim()),
            type: getInvoiceType(inv.LOCNCODE || ""),
            shipTo: {
                name: (inv.CNTCPRSN || "").trim(),
                address1: (inv.ADDRESS1 || "").trim(),
                city: (inv.CITY || "").trim(),
                state: (inv.STATE || "").trim()
            }
        }));
    } catch (error) {
        console.error("Error exporting invoices:", error);
        throw new Error("Failed to fetch invoices for export");
    }
}

export async function searchCustomers(query: string) {
    try {
        if (!query || query.length < 2) return [];

        const results = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT TOP 10 CUSTNMBR, CUSTNAME, PRBTADCD, PRSTADCD 
             FROM RM00101 
             WHERE (CUSTNMBR LIKE @P1 OR CUSTNAME LIKE @P1) 
               AND INACTIVE = 0 
               AND CUSTNAME NOT LIKE '%DO NOT USE%'
               AND CUSTNMBR NOT LIKE '%DO NOT USE%'
             ORDER BY CUSTNAME`,
            `%${query}%`
        );

        return results.map(c => ({
            id: c.CUSTNMBR.trim(),
            name: c.CUSTNAME.trim(),
            defaultBillTo: c.PRBTADCD.trim(),
            defaultShipTo: c.PRSTADCD.trim()
        }));
    } catch (error) {
        console.error("Error searching customers:", error);
        throw new Error("Failed to search customers");
    }
}

export async function getCustomerAddresses(customerId: string) {
    try {
        const [master, addresses] = await Promise.all([
            prismaGP.$queryRawUnsafe<any[]>(
                `SELECT PRBTADCD, PRSTADCD FROM RM00101 WHERE CUSTNMBR = @P1`,
                customerId
            ),
            prismaGP.$queryRawUnsafe<any[]>(
                `SELECT ADRSCODE, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, COUNTRY, TAXSCHID 
                 FROM RM00102 WHERE CUSTNMBR = @P1`,
                customerId
            )
        ]);

        if (master.length === 0) return { addresses: [], billToId: "", shipToId: "" };

        return {
            addresses: addresses.map(a => ({
                id: a.ADRSCODE.trim(),
                address1: (a.ADDRESS1 || "").trim(),
                address2: (a.ADDRESS2 || "").trim(),
                city: (a.CITY || "").trim(),
                state: (a.STATE || "").trim(),
                zip: (a.ZIP || "").trim(),
                country: (a.COUNTRY || "").trim(),
                taxScheduleId: (a.TAXSCHID || "").trim()
            })),
            billToId: master[0].PRBTADCD.trim(),
            shipToId: master[0].PRSTADCD.trim()
        };
    } catch (error) {
        console.error("Error fetching customer addresses:", error);
        throw new Error("Failed to fetch customer addresses");
    }
}

export async function searchProducts(query: string, siteId: string = 'MAIN') {
    try {
        const isAllSites = siteId === 'ALL';

        // Helper to tokenize search query respecting quotes
        const getAndGroups = (q: string) => {
            const groups: string[] = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < q.length; i++) {
                const c = q[i];
                if (c === '"') inQuotes = !inQuotes;
                if (c === '+' && !inQuotes) {
                    groups.push(current.trim());
                    current = "";
                } else {
                    current += c;
                }
            }
            if (current.trim()) groups.push(current.trim());
            return groups.filter(Boolean);
        };

        const getOrTerms = (group: string) => {
            const terms: string[] = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < group.length; i++) {
                const c = group[i];
                if (c === '"') {
                    inQuotes = !inQuotes;
                } else if (/\s/.test(c) && !inQuotes) {
                    if (current.trim()) terms.push(current.trim());
                    current = "";
                } else {
                    current += c;
                }
            }
            if (current.trim()) terms.push(current.trim());
            return terms.filter(Boolean);
        };

        let builderSql = "";
        const builderParams: any[] = [];
        let pIdx = 1;

        // Note: Removing p.ITEMTYPE = 1 to allow searching service/other items
        if (isAllSites) {
            builderSql = `
                SELECT TOP 15 p.ITEMNMBR, p.ITEMDESC, p.CURRCOST, p.ITMTRKOP,
                       (SELECT SUM(QTYONHND) FROM IV00102 WHERE ITEMNMBR = p.ITEMNMBR) as QTYONHND, 
                       (SELECT SUM(ATYALLOC) FROM IV00102 WHERE ITEMNMBR = p.ITEMNMBR) as ATYALLOC
                FROM IV00101 p
                WHERE 1=1
            `;
        } else {
            builderSql = `
                SELECT TOP 15 p.ITEMNMBR, p.ITEMDESC, p.CURRCOST, p.ITMTRKOP,
                       COALESCE(q.QTYONHND, 0) as QTYONHND, 
                       COALESCE(q.ATYALLOC, 0) as ATYALLOC
                FROM IV00101 p
                LEFT JOIN IV00102 q ON p.ITEMNMBR = q.ITEMNMBR AND q.LOCNCODE = @P1
                WHERE 1=1
            `;
            builderParams.push(siteId);
            pIdx = 2;
        }

        if (query) {
            const andGroups = getAndGroups(query);
            const cteNames: string[] = [];
            const cteDefinitions: string[] = [];

            andGroups.forEach((group, gIdx) => {
                const orTerms = getOrTerms(group);
                if (orTerms.length > 0) {
                    const cteName = `TokenMatch${gIdx}`;
                    cteNames.push(cteName);

                    const unionQueries = orTerms.map((term) => {
                        let value = term;
                        let isExact = false;

                        if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.substring(1, value.length - 1);
                            isExact = true;
                        }

                        const pSc = pIdx++;
                        const finalValue = isExact ? value : `%${value}%`;
                        const op = isExact ? '=' : 'LIKE';
                        builderParams.push(finalValue);

                        return `SELECT ITEMNMBR FROM IV00101 WHERE ITEMNMBR ${op} @P${pSc} OR ITEMDESC ${op} @P${pSc}
                                UNION
                                SELECT ITEMNMBR FROM IV00200 WHERE SERLNMBR ${op} @P${pSc}
                                UNION
                                SELECT ITEMNMBR FROM IV30400 WHERE SERLTNUM ${op} @P${pSc}
                                UNION
                                SELECT ITEMNMBR FROM SOP10201 WHERE SERLTNUM ${op} @P${pSc}`;
                    });

                    cteDefinitions.push(`${cteName} AS (
                        ${unionQueries.join("\n                        UNION\n                        ")}
                    )`);
                }
            });

            if (cteDefinitions.length > 0) {
                builderSql = `WITH ${cteDefinitions.join(",\n")} ${builderSql}`;
                const intersectClause = cteNames.map(name => `p.ITEMNMBR IN (SELECT ITEMNMBR FROM ${name})`).join(" AND ");
                builderSql += ` AND (${intersectClause})`;
            }
        }

        const sortStockColumn = isAllSites
            ? `(SELECT SUM(QTYONHND - ATYALLOC) FROM IV00102 WHERE ITEMNMBR = p.ITEMNMBR)`
            : `(COALESCE(q.QTYONHND, 0) - COALESCE(q.ATYALLOC, 0))`;

        builderSql += ` ORDER BY ${sortStockColumn} DESC, p.ITEMNMBR ASC`;

        const results = await prismaGP.$queryRawUnsafe<any[]>(builderSql, ...builderParams);

        return results.map(item => ({
            itemNumber: item.ITEMNMBR.trim(),
            description: item.ITEMDESC.trim(),
            unitPrice: 0,
            unitCost: Number(item.CURRCOST || 0),
            inventory: {
                onHand: Number(item.QTYONHND || 0),
                allocated: Number(item.ATYALLOC || 0),
                available: Number(item.QTYONHND || 0) - Number(item.ATYALLOC || 0),
                siteId: siteId
            }
        }));
    } catch (error) {
        console.error("Error searching products:", error);
        throw new Error("Failed to search products");
    }
}

export async function getSites() {
    try {
        const results = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT LOCNCODE, LOCNDSCR 
             FROM IV40700 
             WHERE LOCNCODE NOT LIKE '%DO NOT USE%' AND LOCNDSCR NOT LIKE '%DO NOT USE%'
             ORDER BY LOCNCODE`
        );

        return results.map(site => ({
            id: site.LOCNCODE.trim(),
            name: site.LOCNDSCR.trim()
        }));
    } catch (error) {
        console.error("Error fetching sites:", error);
        throw new Error("Failed to fetch sites");
    }
}

export async function searchSalesOrders(query: string) {
    try {
        if (!query || query.length < 2) return [];

        const searchPattern = `%${query}%`;
        let errors: string[] = [];

        // Search in Work (SOP10100)
        const workResultsRaw = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT TOP 10 SOPNUMBE, CUSTNMBR, CUSTNAME, DOCDATE, SOPTYPE, BACHNUMB, CSTPONBR, DOCAMNT
             FROM SOP10100 
             WHERE SOPNUMBE LIKE @P1 OR CUSTNAME LIKE @P1 OR CSTPONBR LIKE @P1
             ORDER BY DOCDATE DESC`,
            searchPattern
        ).catch(err => {
            errors.push("Work Table: " + err.message);
            return [];
        });
        const workResults = workResultsRaw.map(r => ({ ...r, IS_HISTORY: false }));

        // Search in History (SOP30200)
        const historyResultsRaw = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT TOP 10 SOPNUMBE, CUSTNMBR, CUSTNAME, DOCDATE, SOPTYPE, CSTPONBR, DOCAMNT
             FROM SOP30200 
             WHERE SOPNUMBE LIKE @P1 OR CUSTNAME LIKE @P1 OR CSTPONBR LIKE @P1
             ORDER BY DOCDATE DESC`,
            searchPattern
        ).catch(err => {
            errors.push("History Table: " + err.message);
            return [];
        });
        const historyResults = historyResultsRaw.map(r => ({ ...r, IS_HISTORY: true }));

        // Merge and deduplicate
        const merged = [...workResults, ...historyResults];
        const unique = Array.from(new Set(merged.map(o => o.SOPNUMBE.trim())))
            .map(id => merged.find(o => o.SOPNUMBE.trim() === id)!);

        return {
            results: unique.map(o => ({
                id: o.SOPNUMBE.trim(),
                customerNumber: (o.CUSTNMBR || "").trim(),
                customerName: (o.CUSTNAME || "").trim(),
                date: o.DOCDATE,
                poNumber: (o.CSTPONBR || "").trim(),
                type: o.SOPTYPE,
                totalAmount: Number(o.DOCAMNT || 0),
                isHistory: o.IS_HISTORY
            })).slice(0, 15),
            error: errors.length > 0 ? errors.join(" | ") : null
        };
    } catch (error: any) {
        console.error("Error searching Sales Orders:", error);
        return { results: [], error: error.message };
    }
}



export async function getAllocationData(itemNumber: string, siteId: string, currentSopNumber?: string, currentSopType?: number, guestId?: string) {
    try {
        const session = await auth();
        const userId = session?.user?.email || (session?.user as any)?.id || guestId || "anonymous";
        const tItem = (itemNumber || "").trim();
        const tSite = (siteId || "").trim();
        const tSop = (currentSopNumber || "").trim();
        console.log(`[Allocation] Start: Item="${tItem}", Site="${tSite}", CurrentSOP="${tSop}"`);

        // Layer 1: Check Item Master for Tracking Option
        let iv00101 = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT ITEMNMBR, ITMTRKOP FROM IV00101 WHERE UPPER(LTRIM(RTRIM(ITEMNMBR))) = UPPER(@P1)`,
            tItem
        );

        if (iv00101.length === 0) {
            console.log(`[Allocation] Exact match failed for "${tItem}". Trying LIKE...`);
            iv00101 = await prismaGP.$queryRawUnsafe<any[]>(
                `SELECT TOP 1 ITEMNMBR, ITMTRKOP FROM IV00101 WHERE ITEMNMBR LIKE @P1`,
                `%${tItem}%`
            );
        }

        console.log(`[Allocation] IV00101 query matches: ${iv00101.length}`);

        let tracking = 1; // Default
        if (iv00101.length > 0) {
            const rawItem = iv00101[0];
            console.log(`[Allocation] IV00101 Full Data:`, JSON.stringify(rawItem));
            const itmTrkOp = rawItem.ITMTRKOP ?? rawItem.itmtrkop ?? rawItem.Itmtrkop;
            tracking = Number(itmTrkOp ?? 1);
            console.log(`[Allocation] Tracking parsed as: ${tracking} from raw: ${itmTrkOp}`);
        } else {
            console.warn(`[Allocation] Item "${tItem}" NOT FOUND in IV00101 even with LIKE fallback.`);
        }

        // Layer 2: Fetch Serials for this site (Authority for Serialized Items)
        // We fetch ALL serials and their SOP Work allocation status (if any)
        const serialsRes = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT 
                iv.SERLNMBR, 
                iv.DATERECD,
                (SELECT TOP 1 SOPNUMBE FROM SOP10201 
                 WHERE LTRIM(RTRIM(SERLTNUM)) = LTRIM(RTRIM(iv.SERLNMBR)) 
                 AND LTRIM(RTRIM(ITEMNMBR)) = LTRIM(RTRIM(iv.ITEMNMBR))) as ALLOCATED_SOP
             FROM IV00200 iv
             WHERE UPPER(LTRIM(RTRIM(iv.ITEMNMBR))) = UPPER(@P1) 
               AND UPPER(LTRIM(RTRIM(iv.LOCNCODE))) = UPPER(@P2) 
               AND iv.SERLNSLD = 0
             ORDER BY iv.DATERECD ASC`,
            tItem, tSite
        );

        // Fetch Reservations from prismaApp
        let reservations: any[] = [];
        try {
            await cleanupExpiredReservations();
            reservations = await (prismaApp as any).serialReservation.findMany({
                where: { itemNumber: tItem }
            });
        } catch (reserveError) {
            console.warn("[Allocation] Could not fetch reservations (client/table may be out of sync):", reserveError);
        }

        const serials = serialsRes.map(s => {
            const sn = (s.SERLNMBR || "").trim();
            const reservation = reservations.find(r => r.serialNumber === sn);
            const allocatedSop = (s.ALLOCATED_SOP || "").trim();

            return {
                serialNumber: sn,
                agingDays: Math.ceil(Math.abs(new Date().getTime() - new Date(s.DATERECD).getTime()) / (1000 * 60 * 60 * 24)),
                receiptDate: s.DATERECD ? s.DATERECD.toISOString() : new Date().toISOString(),
                reservedBy: reservation?.reservedBy || null,
                reservedByName: reservation?.userName || null,
                isReservedByMe: reservation?.reservedBy === userId,
                allocatedToSopNumber: allocatedSop || null,
                isAllocatedByOtherOrder: allocatedSop !== "" && allocatedSop !== tSop
            };
        });
        console.log(`[Allocation] Site Serials Found: ${serials.length}`);

        // Layer 3: GLOBAL Serial Check (Safety Net for misconfigured Item Master)
        if (tracking !== 2 && serials.length > 0) {
            console.warn(`[Allocation] Found serials but master said tracking=${tracking}. Forcing Serialized.`);
            tracking = 2;
        } else if (tracking !== 2) {
            const globalSerialCheck = await prismaGP.$queryRawUnsafe<any[]>(
                `SELECT TOP 1 SERLNMBR FROM IV00200 WHERE UPPER(LTRIM(RTRIM(ITEMNMBR))) = UPPER(@P1) AND SERLNSLD = 0`,
                tItem
            );
            if (globalSerialCheck.length > 0) {
                console.warn(`[Allocation] Item found in IV00200 globally. Forcing Serialized.`);
                tracking = 2;
            }
        }

        // Layer 4: Fetch Site Stock (Authority for Non-Serialized Items)
        const siteStock = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT QTYONHND, ATYALLOC FROM IV00102 WHERE UPPER(LTRIM(RTRIM(ITEMNMBR))) = UPPER(@P1) AND UPPER(LTRIM(RTRIM(LOCNCODE))) = UPPER(@P2)`,
            tItem, tSite
        );
        const onHand = Number(siteStock[0]?.QTYONHND || 0);
        const allocated = Number(siteStock[0]?.ATYALLOC || 0);

        // Final Calculation
        let available = Math.max(0, onHand - allocated);
        if (tracking === 2) {
            // AUTHORITATIVE for Serialized: The actual count of available serials
            available = serials.length;
        }
        console.log(`[Allocation] Site Available Calc: ${available} (TableStock=${onHand - allocated}, SerialsCount=${serials.length})`);

        // Layer 5: Warehouse-Wide Availability (REMOVED for performance)
        const totalAvail = 0;
        console.log(`[Allocation] Total Avail Calc: SKIP (Performance Optimization)`);

        return {
            trackingOption: tracking,
            availableQty: available,
            totalAvailableAcrossSites: totalAvail,
            qtyOnHand: onHand,
            serials
        };
    } catch (error) {
        console.error("Error in getAllocationData:", error);
        throw new Error("Allocation data error");
    }
}

export async function getSalesOrderDetails(orderNumber: string, sopType?: number) {
    try {
        console.log(`[Diagnostic] Fetching details for: ${orderNumber} (Type: ${sopType || 'Any'})`);

        // 1. Find the Record (Try Work then History)
        // We use a broader query first to see if it even exists
        const whereClause = sopType ? `WHERE SOPNUMBE = @P1 AND SOPTYPE = @P2` : `WHERE SOPNUMBE = @P1`;
        const params = sopType ? [orderNumber, sopType] : [orderNumber];

        let headerRes = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT SOPNUMBE, CUSTNMBR, SOPTYPE FROM SOP10100 ${whereClause}`,
            ...params
        ).catch(() => []);

        let isHistory = false;
        let tableUsed = 'SOP10100';

        if (headerRes.length === 0) {
            headerRes = await prismaGP.$queryRawUnsafe<any[]>(
                `SELECT SOPNUMBE, CUSTNMBR, SOPTYPE FROM SOP30200 ${whereClause}`,
                ...params
            ).catch(() => []);
            isHistory = true;
            tableUsed = 'SOP30200';
        }

        if (headerRes.length === 0) {
            console.warn(`[Diagnostic] Order ${orderNumber} not found in any table.`);
            return null;
        }

        const h = headerRes[0];
        const actualSopType = h.SOPTYPE;
        const customerId = h.CUSTNMBR.trim();

        // 2. Fetch progressive header data (separate tries for optional columns)
        const metadata = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT * FROM ${tableUsed} WHERE RTRIM(SOPNUMBE) = @P1 AND SOPTYPE = @P2`,
            orderNumber.trim(), actualSopType
        ).catch(async (err) => {
            console.error(`[Diagnostic] Metadata fetch failed on ${tableUsed} for ${orderNumber}:`, err.message);
            return await prismaGP.$queryRawUnsafe<any[]>(
                `SELECT CUSTNAME, PRBTADCD, PRSTADCD, LOCNCODE, DOCDATE, BACHNUMB, TRDISAMT, TAXSCHID
                 FROM ${tableUsed} WHERE RTRIM(SOPNUMBE) = @P1 AND SOPTYPE = @P2`,
                orderNumber.trim(), actualSopType
            ).catch(() => []);
        });

        const m = metadata[0] || {};
        console.log(`[Diagnostic] Raw Header keys:`, Object.keys(m));
        console.log(`[Diagnostic] Raw Header CSTPONBR:`, m.CSTPONBR);

        // Find PO Number (try multiple potential column names just in case)
        const poNum = m.CSTPONBR || m.CUSTPO || m.PONUMBER || m.PO_Number || m.CUST_PO_Number || "";

        // 2.5 Fetch Serial Numbers for the entire order
        const serialTable = isHistory ? 'SOP30301' : 'SOP10201';
        console.log(`[Diagnostic] Fetching Serials from ${serialTable} for Order=${orderNumber}, Type=${actualSopType}`);
        const orderSerials = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT LNITMSEQ, SERLTNUM FROM ${serialTable} WHERE RTRIM(SOPNUMBE) = @P1 AND SOPTYPE = @P2`,
            orderNumber.trim(), actualSopType
        ).catch(() => []);

        // Group serial numbers by LNITMSEQ
        const serialMap: Record<number, string[]> = {};
        orderSerials.forEach(s => {
            const seq = Number(s.LNITMSEQ);
            if (!serialMap[seq]) serialMap[seq] = [];
            serialMap[seq].push((s.SERLTNUM || "").trim());
            console.log(`[Diagnostic] Mapped SN: ${s.SERLTNUM.trim()} to Seq: ${seq}`);
        });

        // 3. Fetch Lines
        const lineTable = isHistory ? 'SOP30300' : 'SOP10200';
        const lines = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT *, ATYALLOC, QTYFULFI FROM ${lineTable} WHERE RTRIM(SOPNUMBE) = @P1 AND SOPTYPE = @P2 ORDER BY LNITMSEQ`,
            orderNumber.trim(), actualSopType
        ).catch(async (err) => {
            console.error(`[Diagnostic] SELECT * for lines failed on ${lineTable}:`, err.message);
            return await prismaGP.$queryRawUnsafe<any[]>(
                `SELECT ITEMNMBR, ITEMDESC, QUANTITY, UNITPRCE, UNITCOST, UOFM, LOCNCODE, ATYALLOC, QTYFULFI, LNITMSEQ
                 FROM ${lineTable} WHERE RTRIM(SOPNUMBE) = @P1 AND SOPTYPE = @P2 ORDER BY LNITMSEQ`,
                orderNumber.trim(), actualSopType
            ).catch(() => []);
        });

        console.log(`[Diagnostic] Found ${lines.length} lines for ${orderNumber}`);
        lines.forEach(l => {
            console.log(`[Diagnostic] Line: Item=${l.ITEMNMBR.trim()}, Seq=${l.LNITMSEQ}, QTYFULFI=${l.QTYFULFI}`);
        });

        // 4. Get Customer Details
        const customerFull = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT CUSTNMBR, CUSTNAME, PRBTADCD, PRSTADCD FROM RM00101 WHERE CUSTNMBR = @P1`,
            customerId
        ).catch(() => []);

        return {
            header: {
                orderNumber: orderNumber,
                customerId: customerId,
                customerName: (m.CUSTNAME || "").trim(),
                billToId: (m.PRBTADCD || "").trim(),
                shipToId: (m.PRSTADCD || "").trim(),
                siteId: (m.LOCNCODE || "").trim(),
                date: m.DOCDATE,
                batch: (m.BACHNUMB || "").trim(),
                poNumber: (poNum + "").trim(),
                tradeDiscount: Number(m.TRDISAMT || 0),
                taxScheduleId: (m.TAXSCHID || "").trim(),
                sopType: actualSopType,
                isHistory: isHistory
            },
            customer: customerFull.length > 0 ? {
                id: customerFull[0].CUSTNMBR.trim(),
                name: customerFull[0].CUSTNAME.trim(),
                defaultBillTo: customerFull[0].PRBTADCD.trim(),
                defaultShipTo: customerFull[0].PRSTADCD.trim()
            } : null,
            lines: lines.map(l => ({
                id: Math.random().toString(36).substring(2, 9),
                itemNumber: (l.ITEMNMBR || "").trim(),
                description: (l.ITEMDESC || "").trim(),
                quantity: Number(l.QUANTITY || 0),
                unitPrice: Number(l.UNITPRCE || 0),
                unitCost: Number(l.UNITCOST || 0),
                total: Number(l.QUANTITY || 0) * Number(l.UNITPRCE || 0),
                uom: (l.UOFM || "").trim(),
                siteId: (l.LOCNCODE || "").trim(),
                qtyAllocated: Number(l.ATYALLOC || 0),
                qtyFulfilled: Number(l.QTYFULFI || 0),
                serialNumbers: serialMap[Number(l.LNITMSEQ)] || [],
                // We'll treat all linked serials as fulfilled if qtyFulfilled > 0 for now, 
                // or more logically, the first N serials where N = qtyFulfilled
                fulfilledSerialNumbers: (serialMap[Number(l.LNITMSEQ)] || []).slice(0, Number(l.QTYFULFI || 0)),
                // UI Specific fields
                priceLevel: (l.PRCLEVEL || 'STD').trim(),
                shipToAddressId: (l.PRSTADCD || m.PRSTADCD || "").trim(),
                markdown: Number(l.MRKDNAMT || 0),
                taxScheduleId: (l.TAXSCHID || "").trim()
            }))
        };
    } catch (error: any) {
        console.error("Critical error in getSalesOrderDetails:", error);
        throw new Error("Unable to retrieve order details from GP. Please check DB logs.");
    }
}

export async function getInvoicePaymentStatus(docNumber: string) {
    try {
        const tDoc = (docNumber || "").trim();
        console.log(`[getInvoicePaymentStatus] Fetching for: ${tDoc}`);

        // 1. Get Main Document Info (Look in Open RM first, then History)
        let docInfo = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT DOCNUMBR, ORTRXAMT, CURTRXAM, DOCDATE, RMDTYPAL, CUSTNMBR FROM RM20101 WHERE LTRIM(RTRIM(DOCNUMBR)) = @P1`,
            tDoc
        );

        if (docInfo.length === 0) {
            docInfo = await prismaGP.$queryRawUnsafe<any[]>(
                `SELECT DOCNUMBR, ORTRXAMT, CURTRXAM, DOCDATE, RMDTYPAL, CUSTNMBR FROM RM30101 WHERE LTRIM(RTRIM(DOCNUMBR)) = @P1`,
                tDoc
            );
        }

        if (docInfo.length === 0) {
            console.log(`[getInvoicePaymentStatus] Document ${tDoc} not found in RM tables.`);
            return null;
        }

        const main = docInfo[0];
        const totalAmount = Number(main.ORTRXAMT || 0);
        const amountRemaining = Number(main.CURTRXAM || 0);

        // 2. Get Applied Payments/Credits (Use UNION to deduplicate if record exists in both tables)
        const applications = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT APFRDCNM, APPTOAMT, DATE1, APFRDCTY 
             FROM (
                SELECT APFRDCNM, APPTOAMT, DATE1, APFRDCTY FROM RM20201 WHERE LTRIM(RTRIM(APTODCNM)) = @P1
                UNION
                SELECT APFRDCNM, APPTOAMT, DATE1, APFRDCTY FROM RM30201 WHERE LTRIM(RTRIM(APTODCNM)) = @P1
             ) app`,
            tDoc
        );

        const typeMapping: Record<number, string> = {
            7: "Credit Memo",
            8: "Return",
            9: "Payment"
        };

        return {
            docNumber: tDoc,
            customerNumber: (main.CUSTNMBR || "").trim(),
            totalAmount,
            amountRemaining,
            amountPaid: totalAmount - amountRemaining,
            payments: applications.map(app => ({
                docNumber: (app.APFRDCNM || "").trim(),
                date: app.DATE1,
                amountApplied: Number(app.APPTOAMT || 0),
                type: typeMapping[app.APFRDCTY] || `Other (${app.APFRDCTY})`
            }))
        };
    } catch (error: any) {
        console.error("[getInvoicePaymentStatus] Error:", error);
        // Throw with original error for better debugging in console
        throw new Error(`Failed to fetch payment status: ${error.message || "Unknown error"}`);
    }
}
