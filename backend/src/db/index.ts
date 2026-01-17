import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function initializePrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
    console.log('Prisma client initialized.');
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Prisma client not initialized. Call initializePrisma() first.');
  }
  return prisma;
}
