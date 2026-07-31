import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "src");
const output = resolve(root, "dist");

function cleanUrl(value, fallback) {
  const candidate = (value || fallback).trim().replace(/\/$/, "");
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  }
  return url.toString().replace(/\/$/, "");
}

const replacements = new Map([
  ["__PLATFORM_URL__", cleanUrl(process.env.PLATFORM_URL, "http://localhost:3000")],
  ["__CONTACT_URL__", cleanUrl(process.env.CONTACT_URL, "https://t.me/mag_english")],
  ["__LANDING_CANONICAL_URL__", cleanUrl(process.env.LANDING_CANONICAL_URL, "http://localhost:4173")]
]);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

const indexPath = resolve(output, "index.html");
let html = await readFile(indexPath, "utf8");
for (const [token, value] of replacements) {
  html = html.replaceAll(token, value);
}
await writeFile(indexPath, html);

console.log(`Landing built at ${output}`);
