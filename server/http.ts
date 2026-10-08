import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const issue = err.issues[0]
    res.status(400).json({ error: issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : 'Input tidak valid' })
    return
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'Ukuran file terlalu besar.' })
    return
  }
  if (err?.code === 'P2002') {
    res.status(409).json({ error: 'Data dengan nama/slug ini sudah ada.' })
    return
  }
  if (err?.code === 'P2025') {
    res.status(404).json({ error: 'Data tidak ditemukan.' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Terjadi kesalahan di server.' })
}
