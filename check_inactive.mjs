import { PrismaClient } from './src/generated/gp/index.js';
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.$queryRawUnsafe(`
      SELECT TOP 1 * FROM RM00101
    `);
        console.log('Result keys:', Object.keys(result[0]));
        if (result[0].hasOwnProperty('INACTIVE')) {
            console.log('INACTIVE field exists. Value of first record:', result[0].INACTIVE);
        } else {
            console.log('INACTIVE field NOT found.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
