import { NextResponse } from "next/server";
import { PrismaClient as GPPrismaClient } from "@/generated/gp";

const gpPrisma = new GPPrismaClient();

export async function GET() {
    try {
        const [classIds, siteIds]: [any[], any[]] = await Promise.all([
            gpPrisma.$queryRawUnsafe(`SELECT DISTINCT RTRIM(ITMCLSCD) as id FROM IV00101 WHERE ITMCLSCD <> '' ORDER BY id`),
            gpPrisma.$queryRawUnsafe(`SELECT DISTINCT RTRIM(LOCNCODE) as id FROM IV00102 WHERE LOCNCODE <> '' ORDER BY id`),
        ]);

        return NextResponse.json({
            classIds: classIds.map((c) => c.id),
            siteIds: siteIds.map((s) => s.id),
        });
    } catch (error: any) {
        console.error("Inventory Filters API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
