import { PrismaClient as PrismaClientGP } from '@/generated/gp';
import { PrismaClient as PrismaClientApp } from '@/generated/app';

const globalForPrisma = global as unknown as {
  prismaGP: PrismaClientGP;
  prismaApp: PrismaClientApp;
};

export const prismaGP =
  globalForPrisma.prismaGP ||
  new PrismaClientGP({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

export const prismaApp =
  globalForPrisma.prismaApp ||
  new PrismaClientApp({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGP = prismaGP;
  globalForPrisma.prismaApp = prismaApp;
}
