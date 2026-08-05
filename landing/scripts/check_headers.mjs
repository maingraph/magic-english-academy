import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

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

server.listen(4179, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://127.0.0.1:4179");

  // Scroll down 600px
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(300);

  const navBox = await page.locator(".nav").boundingBox();
  const promoBox = await page.locator(".promo-bar").boundingBox();
  console.log("Nav box at scroll 600px:", navBox);
  console.log("Promo box at scroll 600px:", promoBox);

  // Check all section headers bounding boxes
  const headers = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("h1, h2, .variant-head, .section-heading")).map(el => {
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName, text: el.textContent?.trim().slice(0, 30), top: rect.top, height: rect.height };
    });
  });
  console.log("Visible headers on screen at scroll 600px:", headers);

  await browser.close();
  server.close();
});
