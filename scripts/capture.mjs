import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const dir = join(process.cwd(), 'client', 'dist')
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:4173')
  let filePath = join(dir, url.pathname === '/' ? 'index.html' : url.pathname)
  if (!existsSync(filePath)) {
    filePath = join(dir, 'index.html')
  }
  const ext = extname(filePath)
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
  res.end(readFileSync(filePath))
})

server.listen(4173, async () => {
  const tag = process.argv[2] || 'after'
  const browser = await chromium.launch()
  const sizes = [
    { w: 360, h: 780, name: '360x780' },
    { w: 402, h: 874, name: '402x874' },
    { w: 430, h: 932, name: '430x932' },
  ]

  for (const size of sizes) {
    for (let s = 1; s <= 4; s++) {
      const page = await browser.newPage({
        viewport: { width: size.w, height: size.h },
        deviceScaleFactor: 2,
      })
      await page.goto(`http://localhost:4173/?mock=${s}`)
      await page.waitForTimeout(400)
      await page.screenshot({ path: `screenshots/${tag}_state${s}_${size.name}.png` })
      await page.close()
    }
  }

  await browser.close()
  server.close()
  console.log(`Captured all screenshots for ${tag}`)
})
