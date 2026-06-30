import { PrismaClient } from '@prisma/client'
import { join } from "path"

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("/home/z/my-project")) {
  process.env.DATABASE_URL = `file:${join(process.cwd(), "db", "custom.db")}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.DEBUG_PRISMA === "true" ? ["query"] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export function canWriteRuntimeDatabase(): boolean {
  const databaseUrl = process.env.DATABASE_URL?.trim() || ""
  const hostedRuntime = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV)
  if (hostedRuntime && databaseUrl.startsWith("file:")) return false
  return true
}
