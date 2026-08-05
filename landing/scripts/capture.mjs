import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const artifactDir = "/Users/imjustchilling/.gemini/antigravity/brain/c8af3fc0-0134-4c18-8a7a-cbb153d30dfc";
const distDir = resolve(import.meta.dirname, "../dist");

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2"
};

const server = createServer(async (req, res) => {
  try {
    let filePath = resolve(distDir, `.${req.url === "/" ? "/index.html" : req.url.split("?")[0]}`);
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(4177, async () => {
  console.log("Server listening at http://127.0.0.1:4177");
  const browser = await chromium.launch();

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("http://127.0.0.1:4177");

  // 1. Desktop Navbar
  await page.screenshot({ path: `${artifactDir}/navbar_desktop.png`, clip: { x: 0, y: 0, width: 1280, height: 180 } });

  // 2. Payment Modal
  await page.click("[data-payment]");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${artifactDir}/payment_modal.png` });
  await page.click("#paymentModal .modal-close");
  await page.waitForTimeout(200);

  // 3. Inside & Streak
  const inside = page.locator("#inside");
  await inside.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await inside.screenshot({ path: `${artifactDir}/inside_and_streak.png` });

  // 4. Gift section with multi-gifts
  const club = page.locator("#club");
  await club.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await club.screenshot({ path: `${artifactDir}/gift_section.png` });

  // 5. Straight Certificate
  const ach = page.locator("#achievements");
  await ach.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await ach.screenshot({ path: `${artifactDir}/straight_certificate.png` });

  // 6. Mobile Viewport (Level Cards)
  const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobilePage.goto("http://127.0.0.1:4177");
  const levels = mobilePage.locator("#levels");
  await levels.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(300);
  await levels.screenshot({ path: `${artifactDir}/mobile_levels.png` });

  await browser.close();
  server.close();
  console.log("Screenshots captured successfully!");
});
