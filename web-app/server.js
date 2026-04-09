/**
 * Custom Next.js server — ensures all API routes run in a single Node.js process.
 * This fixes the task queue sharing problem: globalThis.__razumTaskQueue is now
 * truly shared between /api/chat and /api/miners/* routes.
 */
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, hostname, () => {
      console.log(`> Razum server ready on http://${hostname}:${port}`)
      console.log(`> Mode: ${dev ? 'development' : 'production'}`)
      console.log(`> PID: ${process.pid}`)
    })
})
