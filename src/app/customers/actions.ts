"use server";

import { prismaGP } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

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

        // 3. Calculate Open AR (Subtotal: Invoices/Debits - Credits/Payments)
        const arResult = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT SUM(
                CASE 
                    WHEN RMDTYPAL >= 7 THEN -CURTRXAM 
                    ELSE CURTRXAM 
                END
             ) as TotalAR 
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
            openAR: Number(arResult[0]?.TotalAR || 0)
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

        let builderSql = `
            SELECT TOP 15 p.ITEMNMBR, p.ITEMDESC, p.CURRCOST, 
                   COALESCE(q.QTYONHND, 0) as QTYONHND, 
                   COALESCE(q.ATYALLOC, 0) as ATYALLOC
            FROM IV00101 p
            LEFT JOIN IV00102 q ON p.ITEMNMBR = q.ITEMNMBR AND q.LOCNCODE = @P1
            WHERE p.ITEMTYPE = 1
        `;
        const builderParams: any[] = [siteId];
        let pIdx = 2; // Start from 2 since P1 is siteId

        if (query) {
            const andGroups = getAndGroups(query);
            andGroups.forEach((group) => {
                const orTerms = getOrTerms(group);
                if (orTerms.length > 0) {
                    const orConditions = orTerms
                        .map((term) => {
                            builderParams.push(`%${term}%`);
                            return `(p.ITEMNMBR LIKE @P${pIdx++} OR p.ITEMDESC LIKE @P${pIdx - 1})`;
                        })
                        .join(" OR ");
                    builderSql += ` AND (${orConditions})`;
                }
            });
        }

        builderSql += ` ORDER BY (COALESCE(q.QTYONHND, 0) - COALESCE(q.ATYALLOC, 0)) DESC, p.ITEMNMBR ASC`;

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
        const workResults = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT TOP 10 SOPNUMBE, CUSTNMBR, CUSTNAME, DOCDATE, SOPTYPE, BACHNUMB, CSTPONBR
             FROM SOP10100 
             WHERE SOPNUMBE LIKE @P1 OR CUSTNAME LIKE @P1
             ORDER BY DOCDATE DESC`,
            searchPattern
        ).catch(err => {
            errors.push("Work Table: " + err.message);
            return [];
        });

        // Search in History (SOP30200)
        const historyResults = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT TOP 10 SOPNUMBE, CUSTNMBR, CUSTNAME, DOCDATE, SOPTYPE, CSTPONBR
             FROM SOP30200 
             WHERE SOPNUMBE LIKE @P1 OR CUSTNAME LIKE @P1
             ORDER BY DOCDATE DESC`,
            searchPattern
        ).catch(err => {
            errors.push("History Table: " + err.message);
            return [];
        });

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
                type: o.SOPTYPE
            })).slice(0, 15),
            error: errors.length > 0 ? errors.join(" | ") : null
        };
    } catch (error: any) {
        console.error("Error searching Sales Orders:", error);
        return { results: [], error: error.message };
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
        let metadata = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT * FROM ${tableUsed} WHERE SOPNUMBE = @P1 AND SOPTYPE = @P2`,
            orderNumber, actualSopType
        ).catch(async (e) => {
            console.error(`[Diagnostic] SELECT * failed for ${tableUsed}:`, e.message);
            return await prismaGP.$queryRawUnsafe<any[]>(
                `SELECT CUSTNAME, PRBTADCD, PRSTADCD, LOCNCODE, DOCDATE, BACHNUMB, TRDISAMT, TAXSCHID
                 FROM ${tableUsed} WHERE SOPNUMBE = @P1 AND SOPTYPE = @P2`,
                orderNumber, actualSopType
            ).catch(() => []);
        });

        const m = metadata[0] || {};
        console.log(`[Diagnostic] Raw Header keys:`, Object.keys(m));
        console.log(`[Diagnostic] Raw Header CSTPONBR:`, m.CSTPONBR);

        // Find PO Number (try multiple potential column names just in case)
        const poNum = m.CSTPONBR || m.CUSTPO || m.PONUMBER || m.PO_Number || m.CUST_PO_Number || "";

        // 3. Fetch Lines
        const lineTable = isHistory ? 'SOP30300' : 'SOP10200';
        const lines = await prismaGP.$queryRawUnsafe<any[]>(
            `SELECT * FROM ${lineTable} WHERE SOPNUMBE = @P1 AND SOPTYPE = @P2 ORDER BY LNITMSEQ`,
            orderNumber, actualSopType
        ).catch(async (err) => {
            console.error(`[Diagnostic] SELECT * for lines failed on ${lineTable}:`, err.message);
            return await prismaGP.$queryRawUnsafe<any[]>(
                `SELECT ITEMNMBR, ITEMDESC, QUANTITY, UNITPRCE, UNITCOST, UOFM, LOCNCODE
                 FROM ${lineTable} WHERE SOPNUMBE = @P1 AND SOPTYPE = @P2 ORDER BY LNITMSEQ`,
                orderNumber, actualSopType
            ).catch(() => []);
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
                taxScheduleId: (m.TAXSCHID || "").trim()
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
                // UI Specific fields
                priceLevel: (l.PRCLEVEL || 'STD').trim(),
                shipToAddressId: (l.PRSTADCD || m.PRSTADCD || "").trim(),
                markdown: Number(l.MRKDNAMT || 0)
            }))
        };
    } catch (error: any) {
        console.error("Critical error in getSalesOrderDetails:", error);
        throw new Error("Unable to retrieve order details from GP. Please check DB logs.");
    }
}
