import { NextRequest, NextResponse } from "next/server";
import { PrismaClient as GPPrismaClient } from "@/generated/gp";

const gpPrisma = new GPPrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";
        const classIds = searchParams.get("classIds")?.split(",").filter(Boolean) || [];
        const siteId = searchParams.get("siteId") || "";
        const hideZero = searchParams.get("hideZero") !== "false";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        let sql = `
            SELECT p.ITEMNMBR, p.ITEMDESC, p.ITMCLSCD, q.LOCNCODE,
                   p.CURRCOST,
                   COALESCE(q.QTYONHND, 0) as QTYONHND, 
                   COALESCE(q.ATYALLOC, 0) as ATYALLOC,
                   (COALESCE(q.QTYONHND, 0) - COALESCE(q.ATYALLOC, 0)) as QTYAVAIL
            FROM IV00101 p
            INNER JOIN IV00102 q ON p.ITEMNMBR = q.ITEMNMBR
            WHERE p.ITEMTYPE = 1 AND q.LOCNCODE <> ''
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (q) {
            // Helper to tokenize search query respecting quotes
            const getAndGroups = (query: string) => {
                const groups: string[] = [];
                let current = "";
                let inQuotes = false;
                for (let i = 0; i < query.length; i++) {
                    const c = query[i];
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

            const andGroups = getAndGroups(q);
            andGroups.forEach((group) => {
                const orTerms = getOrTerms(group);
                if (orTerms.length > 0) {
                    const orConditions = orTerms
                        .map((term) => {
                            params.push(`%${term}%`);
                            const pIdx = paramIndex++;
                            return `(p.ITEMNMBR LIKE @P${pIdx} OR p.ITEMDESC LIKE @P${pIdx})`;
                        })
                        .join(" OR ");
                    sql += ` AND (${orConditions})`;
                }
            });
        }

        if (classIds.length > 0) {
            const classPlaceholders = classIds.map((_, i) => `@P${paramIndex + i}`).join(",");
            sql += ` AND p.ITMCLSCD IN (${classPlaceholders})`;
            params.push(...classIds);
            paramIndex += classIds.length;
        }

        if (siteId && siteId !== "ALL") {
            sql += ` AND q.LOCNCODE = @P${paramIndex}`;
            params.push(siteId);
            paramIndex++;
        }

        if (hideZero) {
            sql += ` AND q.QTYONHND > 0`;
        }

        // Get total count for pagination
        const countSql = `SELECT COUNT(*) as total FROM (${sql}) as sub`;
        const countResult: any = await gpPrisma.$queryRawUnsafe(countSql, ...params);
        const total = countResult[0]?.total || 0;

        // Add order and pagination
        sql += ` ORDER BY p.ITEMNMBR OFFSET @P${paramIndex} ROWS FETCH NEXT @P${paramIndex + 1} ROWS ONLY`;
        params.push(offset, limit);

        const items = await gpPrisma.$queryRawUnsafe(sql, ...params);

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
        console.error("Inventory API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
