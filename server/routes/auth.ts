import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../http.js'
import {
  assertLoginAllowed,
  clearLoginAttempts,
  clearSession,
  clientIp,
  createSession,
  readSession,
  recordFailedLogin,
  requireAuth,
} from '../auth.js'

export const authRouter = Router()

// Hash dummy agar waktu respons sama, baik email terdaftar maupun tidak.
let dummyHash: string | undefined
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('not-a-real-password', 12))

const loginBody = z.object({
  email: z.string().trim().toLowerCase().email('Email tidak valid').max(200),
  password: z.string().min(1, 'Password wajib diisi').max(200),
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginBody.parse(req.body)
  const key = `${clientIp(req)}|${email}`
  await assertLoginAllowed(key)

  const user = await prisma.user.findUnique({ where: { email } })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()))
  if (!user || !ok) {
    await recordFailedLogin(key)
    throw new HttpError(401, 'Email atau password salah.')
  }

  await clearLoginAttempts(key)
  await createSession(res, user)
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role })
})

authRouter.post('/logout', (_req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

authRouter.get('/me', async (req, res) => {
  const user = await readSession(req)
  res.set('Cache-Control', 'no-store')
  if (!user) {
    res.status(401).json({ error: 'Belum masuk.' })
    return
  }
  res.json(user)
})

const passwordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(200),
})

authRouter.post('/password', requireAuth(), async (req, res) => {
  const { currentPassword, newPassword } = passwordBody.parse(req.body)
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } })
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'Password saat ini salah.')
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } })
  res.json({ ok: true })
})
