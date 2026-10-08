import { PrismaClient } from '@prisma/client'

// Satu instance per proses (juga dipakai ulang antar invocation di Vercel).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
