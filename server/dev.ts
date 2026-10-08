import { createApp } from './app.js'

const port = Number(process.env.API_PORT ?? 3001)
createApp().listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`)
})
