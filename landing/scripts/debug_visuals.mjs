import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname } from "node:path";

const artifactDir = "/Users/imjustchilling/.gemini/antigravity/brain/c8af3fc0-0134-4c18-8a7a-cbb153d30dfc/fix2";
await mkdir(artifactDir, { recursive: true });

const distDir = resolve(import.meta.dirname, "../dist");

const mimeTypes = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2"
};

const server = createServer(async (req, res) => {
  try {
    let filePath = resolve(distDir, `.${req.url === "/" ? "/index.html" : req.url.split("?")[0]}`);
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("Not found"); }
});

server.listen(4180, async () => {
  console.log("Server at http://127.0.0.1:4180");
  const browser = await chromium.launch();

  const viewports = [
    { name: "desktop_1440", width: 1440, height: 900 },
    { name: "laptop_1024", width: 1024, height: 768 },
    { name: "tablet_768", width: 768, height: 1024 },
    { name: "mobile_375", width: 375, height: 667 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto("http://127.0.0.1:4180");

    // 1. Top of page
    await page.screenshot({ path: `${artifactDir}/${vp.name}_top.png` });

    // 2. Scrolled 300px — check nav transition
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${artifactDir}/${vp.name}_scrolled.png` });

    // 3. Levels section
    const levels = page.locator("#levels");
    if (await levels.count() > 0) {
      await levels.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${artifactDir}/${vp.name}_levels.png`, fullPage: false });
    }

    // 4. Payment modal
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const payBtn = page.locator("[data-payment]").first();
    if (await payBtn.count() > 0) {
      await payBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${artifactDir}/${vp.name}_payment.png` });
    }

    await page.close();
  }

  await browser.close();
  server.close();
  console.log("Screenshots saved to:", artifactDir);
});
