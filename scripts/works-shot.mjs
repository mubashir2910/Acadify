// Visual check for the How It Works section.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME =
    process.env.CHROME_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const URL = process.env.URL || 'http://localhost:3000'
const OUT = 'screenshots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-color-profile=srgb'],
})

async function shot(page, file) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.evaluate(() =>
        document.querySelector('#how-it-works')?.scrollIntoView({ block: 'center' }),
    )
    await sleep(1200)
    // Drop the Cal.com floating button so it doesn't overlap the screenshot.
    await page.evaluate(() => document.querySelector('cal-floating-button')?.remove())
    const el = await page.$('#how-it-works')
    await el.screenshot({ path: `${OUT}/${file}` })
}

const desktop = await browser.newPage()
await desktop.setViewport({ width: 1440, height: 1200 })
await shot(desktop, 'works-desktop.png')
// Tight crop incl. the 02→04 bracket. clip is document-relative, so add scroll.
const b = await desktop.evaluate(() => {
    const el = document.querySelector(
        '#how-it-works .lg\\:grid-cols-2 > div:nth-child(2)',
    )
    const r = el.getBoundingClientRect()
    return {
        x: r.x + window.scrollX,
        y: r.y + window.scrollY,
        width: r.width,
        height: r.height,
    }
})
await desktop.screenshot({
    path: `${OUT}/works-grid.png`,
    clip: { x: b.x - 6, y: b.y - 6, width: b.width + 34, height: b.height + 12 },
})
const leftEl = await desktop.$('#how-it-works .lg\\:grid-cols-2 > div:nth-child(1)')
if (leftEl) await leftEl.screenshot({ path: `${OUT}/works-leftcard.png` })
await desktop.close()

const mobile = await browser.newPage()
await mobile.setViewport({ width: 390, height: 844, isMobile: true })
await shot(mobile, 'works-mobile.png')
// Tight crop of the 02→03→04 region to inspect the alternating connectors.
const mb = await mobile.evaluate(() => {
    const r = document.querySelector('#how-it-works').getBoundingClientRect()
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height }
})
await mobile.screenshot({
    path: `${OUT}/works-mobile-flow.png`,
    clip: { x: mb.x, y: mb.y + mb.h * 0.52, width: mb.w, height: mb.h * 0.4 },
})
await mobile.close()

await browser.close()
console.log('done — screenshots in', OUT)
