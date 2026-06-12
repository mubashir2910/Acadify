// Throwaway visual-verification script for the Acadify Playbook.
// Uses the installed Chrome via puppeteer-core (which ships no Chromium).
// Usage: node scripts/playbook-shots.mjs
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

async function focusBook(page) {
    await page.focus('[aria-roledescription="book"]')
}

async function next(page, times = 1, wait = 1050) {
    for (let i = 0; i < times; i++) {
        await page.keyboard.press('ArrowRight')
        await sleep(wait)
    }
}

async function gotoFeatures(page) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.evaluate(() => {
        document.querySelector('#features')?.scrollIntoView({ block: 'center' })
    })
    await sleep(1600) // entrance + image load
}

// ---- Desktop -------------------------------------------------------------
const desktop = await browser.newPage()
await desktop.setViewport({ width: 1440, height: 1100 })
await gotoFeatures(desktop)
await desktop.screenshot({ path: `${OUT}/01-desktop-closed.png` })
await focusBook(desktop)
await next(desktop, 1)
await desktop.screenshot({ path: `${OUT}/02-desktop-open.png` })
await next(desktop, 2)
await desktop.screenshot({ path: `${OUT}/03-desktop-mid.png` })
await next(desktop, 4)
await sleep(1400) // let the closing flip + button pulse fully settle
await desktop.screenshot({ path: `${OUT}/04-desktop-cta.png` })
await desktop.close()

// ---- Mobile --------------------------------------------------------------
const mobile = await browser.newPage()
await mobile.setViewport({ width: 390, height: 844, isMobile: true })
await gotoFeatures(mobile)
await mobile.screenshot({ path: `${OUT}/05-mobile-closed.png` })
await focusBook(mobile)
await next(mobile, 1)
await mobile.screenshot({ path: `${OUT}/06-mobile-open.png` })
await mobile.close()

await browser.close()
console.log('done — screenshots in', OUT)
