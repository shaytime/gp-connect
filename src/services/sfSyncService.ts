import { prismaApp as prisma } from '../lib/db.js';
import { getSfConnection } from '../lib/sfClient.js';
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Synchronizes orders from Salesforce to PostgreSQL.
 * It fetches the Salesforce Order records and upserts them into the SfOrder table.
 */
export async function syncSalesforceOrders() {
    const conn = await getSfConnection();

    console.log('Fetching orders from Salesforce...');

    // Corrected fields based on user clarification
    const query = `
    SELECT Id, OrderNumber, Account.Name, TotalAmount, Status, 
           Order_Start_Date_Year__c, Order_Start_Date_Month__c, GP_Order_Number__c,
           Master_Record_Type__c, Net_Amount__c, Gross_Sales_Amount_Formula__c,
           Required_Delivery_Date__c
    FROM Order 
    WHERE LastModifiedDate >= LAST_N_DAYS:365
  `;

    try {
        const records = await conn.query(query);
        console.log(`Found ${records.totalSize} records to sync.`);

        for (const record of records.records as any) {
            // Derive exec year/month from Required_Delivery_Date__c per user request
            const deliveryDate = record.Required_Delivery_Date__c ? new Date(record.Required_Delivery_Date__c) : null;
            const execYear = deliveryDate ? deliveryDate.getFullYear() : (record.Order_Start_Date_Year__c ? parseInt(record.Order_Start_Date_Year__c) : null);
            const execMonth = deliveryDate ? deliveryDate.getMonth() + 1 : (record.Order_Start_Date_Month__c ? parseInt(record.Order_Start_Date_Month__c) : null);

            if (record.OrderNumber === '00008512' || !record.Master_Record_Type__c) {
                console.log(`Debug Record ${record.OrderNumber}:`, JSON.stringify({
                    Master_Record_Type__c: record.Master_Record_Type__c,
                    Net_Amount__c: record.Net_Amount__c,
                    Gross_Sales_Amount_Formula__c: record.Gross_Sales_Amount_Formula__c,
                    Required_Delivery_Date__c: record.Required_Delivery_Date__c
                }, null, 2));
            }

            await prisma.sfOrder.upsert({
                where: { sfId: record.Id },
                update: {
                    orderNumber: record.OrderNumber,
                    gpOrderNumber: record.GP_Order_Number__c,
                    execYear,
                    execMonth,
                    accountName: record.Account ? record.Account.Name : null,
                    totalAmount: record.TotalAmount || 0,
                    status: record.Status,
                    modality: record.Master_Record_Type__c,
                    netAmount: record.Net_Amount__c || 0,
                    grossAmount: record.Gross_Sales_Amount_Formula__c || 0,
                    requiredDeliveryDate: deliveryDate,
                    lastSyncedAt: new Date(),
                },
                create: {
                    sfId: record.Id,
                    orderNumber: record.OrderNumber,
                    gpOrderNumber: record.GP_Order_Number__c,
                    execYear,
                    execMonth,
                    accountName: record.Account ? record.Account.Name : null,
                    totalAmount: record.TotalAmount || 0,
                    status: record.Status,
                    modality: record.Master_Record_Type__c,
                    netAmount: record.Net_Amount__c || 0,
                    grossAmount: record.Gross_Sales_Amount_Formula__c || 0,
                    requiredDeliveryDate: deliveryDate,
                },
            });
        }

        console.log('Synchronization complete.');
    } catch (err) {
        console.error('Error during Salesforce sync:', err);
        throw err;
    } finally {
        await prisma.$disconnect();
    }
}

// If this script is run directly
const isMain = process.argv[1] && (
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('sfSyncService.ts') ||
    process.argv[1].endsWith('sfSyncService.js')
);

if (isMain) {
    syncSalesforceOrders()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
