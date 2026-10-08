import express from 'express'
import cookieParser from 'cookie-parser'
import { requireCsrfHeader } from './auth.js'
import { errorHandler } from './http.js'
import { siteUrl } from './env.js'
import { LOCAL_UPLOAD_DIR } from './storage.js'
import { publicRouter, sitemapHandler } from './routes/public.js'
import { authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'
import { cmsRouter } from './routes/cms.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    })
    next()
  })

  app.use(express.json({ limit: '200kb' }))
  app.use(cookieParser())

  // Hanya untuk development: foto disimpan di ./uploads saat Vercel Blob tidak dipakai.
  if (!process.env.VERCEL) {
    app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '365d', immutable: true }))
  }

  app.get('/sitemap.xml', sitemapHandler)
  app.get('/robots.txt', (req, res) => {
    const base = siteUrl() || `${req.protocol}://${req.get('host')}`
    res
      .type('text/plain')
      .set('Cache-Control', 'public, s-maxage=86400')
      .send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`)
  })
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api', requireCsrfHeader)
  app.use('/api', publicRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/admin', cmsRouter)
  app.use('/api/admin', adminRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint tidak ditemukan.' })
  })
  app.use(errorHandler)
  return app
}
