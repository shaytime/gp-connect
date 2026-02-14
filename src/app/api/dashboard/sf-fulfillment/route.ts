import { NextResponse } from 'next/server';
import { prismaApp, prismaGP } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch Salesforce orders from PostgreSQL with explicit select to avoid schema mismatch
        const sfOrders = await prismaApp.sfOrder.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                sfId: true,
                orderNumber: true,
                accountName: true,
                execYear: true,
                execMonth: true,
                gpOrderNumber: true,
                modality: true,
                requiredDeliveryDate: true,
                netAmount: true,
                grossAmount: true,
            }
        });

        if (sfOrders.length > 0) {
            const sample = sfOrders.find(o => o.orderNumber === '00007750' || o.orderNumber === '00008325');
            console.log(`[API DEBUG] Found ${sfOrders.length} orders. Sample (${sample?.orderNumber}): Modality=${sample?.modality}, Net=${sample?.netAmount}`);
        }

        // 2. Extract GP order numbers that are not null
        const gpOrderNumbers = sfOrders
            .map((o) => o.gpOrderNumber)
            .filter((n): n is string => !!n && n.trim() !== "");

        // 3. Query GP for fulfillment status of these orders in chunks
        const CHUNK_SIZE = 1000;
        let gpOrders: any[] = [];

        for (let i = 0; i < gpOrderNumbers.length; i += CHUNK_SIZE) {
            const chunk = gpOrderNumbers.slice(i, i + CHUNK_SIZE);
            const chunkResults = await prismaGP.$queryRawUnsafe(`
                SELECT SOPNUMBE, SOPSTATUS, DOCDATE, DOCAMNT as ORDRAMT
                FROM SOP10100
                WHERE RTRIM(SOPNUMBE) IN (${chunk.map((_, idx) => `@P${idx + 1}`).join(', ')})
                UNION ALL
                SELECT SOPNUMBE, 7 as SOPSTATUS, DOCDATE, DOCAMNT as ORDRAMT
                FROM SOP30200
                WHERE RTRIM(SOPNUMBE) IN (${chunk.map((_, idx) => `@P${idx + 1}`).join(', ')})
            `, ...chunk);
            gpOrders = [...gpOrders, ...(chunkResults as any[])];
        }

        // 4. Map the data together
        const dashboardData = sfOrders.map((sfOrder: any) => {
            const trimmedSfGP = sfOrder.gpOrderNumber?.trim();
            const gpMatch = gpOrders.find(
                (gp) => gp.SOPNUMBE.trim() === trimmedSfGP
            );

            return {
                sfId: sfOrder.sfId,
                orderNumber: sfOrder.orderNumber,
                accountName: sfOrder.accountName,
                execYear: sfOrder.execYear,
                execMonth: sfOrder.execMonth,
                gpOrderNumber: sfOrder.gpOrderNumber,
                gpStatus: gpMatch ? translateGPStatus(gpMatch.SOPSTATUS) : 'Not Linked',
                gpDocDate: gpMatch ? gpMatch.DOCDATE : null,
                gpAmount: gpMatch ? gpMatch.ORDRAMT : 0,
                modality: sfOrder.modality,
                requiredDeliveryDate: sfOrder.requiredDeliveryDate,
                // Ensure strings are numbers for the frontend
                netAmount: typeof sfOrder.netAmount === 'object' ? Number(sfOrder.netAmount) : (parseFloat(sfOrder.netAmount) || 0),
                grossAmount: typeof sfOrder.grossAmount === 'object' ? Number(sfOrder.grossAmount) : (parseFloat(sfOrder.grossAmount) || 0),
            };
        });

        // 5. Calculate Summary Metrics
        const totalSfOrders = sfOrders.length;
        const linkedToGp = sfOrders.filter((o) => !!o.gpOrderNumber && o.gpOrderNumber.trim() !== "").length;
        const fulfilledCount = gpOrders.filter((o) => o.SOPSTATUS >= 6).length;

        // 6. Metadata for filters
        const incomingModalities = Array.from(new Set(sfOrders.map(o => o.modality).filter(Boolean))).sort();

        return NextResponse.json({
            summary: {
                totalSfOrders,
                linkedToGp,
                gpConversionRate: totalSfOrders > 0 ? (linkedToGp / totalSfOrders) * 100 : 0,
                fulfillmentRate: linkedToGp > 0 ? (fulfilledCount / linkedToGp) * 100 : 0,
            },
            modalities: incomingModalities,
            orders: dashboardData,
        });
    } catch (error: any) {
        console.error('Dashboard data fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch dashboard data',
            details: error.message || String(error)
        }, { status: 500 });
    }
}

function translateGPStatus(status: number) {
    switch (status) {
        case 1: return 'New';
        case 2: return 'Ready to Print';
        case 3: return 'Printed';
        case 4: return 'Picked';
        case 5: return 'Packed';
        case 6: return 'Shipped';
        case 7: return 'Invoiced';
        case 8: return 'Voided';
        default: return 'Unknown (' + status + ')';
    }
}
