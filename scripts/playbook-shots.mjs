// Minimal visual check for the Playbook desktop spread (right page = image only).
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

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1100 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await page.evaluate(() =>
    document.querySelector('#features')?.scrollIntoView({ block: 'center' }),
)
await sleep(1600)
await page.focus('[aria-roledescription="book"]')
await page.keyboard.press('ArrowRight') // open to chapter 1
await sleep(1100)
await page.evaluate(() => document.querySelector('cal-floating-button')?.remove())
const book = await page.$('[aria-roledescription="book"]')
if (book) await book.screenshot({ path: `${OUT}/playbook-spread.png` })
await page.keyboard.press('ArrowRight')
await sleep(1100)
if (book) await book.screenshot({ path: `${OUT}/playbook-spread-2.png` })

await browser.close()
console.log('done — screenshots in', OUT)
