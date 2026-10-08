import type { NextFunction, Request, Response } from 'express'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from './db.js'
import { isProd, sessionSecret } from './env.js'
import { HttpError } from './http.js'
import type { SessionUser } from '../shared/types.js'

export const SESSION_COOKIE = 'catalog_session'
const SESSION_DAYS = 7

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser
  }
}

export async function createSession(res: Response, user: { id: string; role: string }) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(sessionSecret())

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  })
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' })
}

export async function readSession(req: Request): Promise<SessionUser | null> {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ['HS256'] })
    if (!payload.sub) return null
    // Selalu cek ke database: user yang dihapus / diganti role langsung kehilangan akses.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    })
    return user
  } catch {
    return null
  }
}

export function requireAuth(roles: SessionUser['role'][] = ['ADMIN', 'EDITOR']) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = await readSession(req)
    if (!user) throw new HttpError(401, 'Silakan masuk terlebih dahulu.')
    if (!roles.includes(user.role)) throw new HttpError(403, 'Akses ditolak.')
    req.user = user
    next()
  }
}

// Perlindungan CSRF: request yang mengubah data wajib membawa header khusus.
// Browser tidak bisa mengirim header ini lintas-origin tanpa CORS (yang tidak kita aktifkan).
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('x-catalog-request') !== '1') throw new HttpError(403, 'Request ditolak.')
  next()
}

// Rate limit login berbasis database supaya tetap berlaku di lingkungan serverless.
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

export async function assertLoginAllowed(key: string) {
  const since = new Date(Date.now() - WINDOW_MS)
  const count = await prisma.loginAttempt.count({ where: { key, createdAt: { gte: since } } })
  if (count >= MAX_ATTEMPTS) {
    throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.')
  }
}

export async function recordFailedLogin(key: string) {
  await prisma.loginAttempt.create({ data: { key } })
  // Bersihkan catatan lama sesekali.
  if (Math.random() < 0.1) {
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - WINDOW_MS) } } })
  }
}

export async function clearLoginAttempts(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } })
}

export function clientIp(req: Request): string {
  const fwd = req.get('x-forwarded-for')
  return (fwd?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown').trim()
}
