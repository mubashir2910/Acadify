// Visual check for the Vision section.
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
        document.querySelector('#vision')?.scrollIntoView({ block: 'center' }),
    )
    await sleep(1300)
    const el = await page.$('#vision')
    await el.screenshot({ path: `${OUT}/${file}` })
}

const desktop = await browser.newPage()
await desktop.setViewport({ width: 1440, height: 1300 })
await shot(desktop, 'vision-desktop.png')
await desktop.close()

const mobile = await browser.newPage()
await mobile.setViewport({ width: 390, height: 844, isMobile: true })
await shot(mobile, 'vision-mobile.png')
await mobile.close()

await browser.close()
console.log('done — screenshots in', OUT)
