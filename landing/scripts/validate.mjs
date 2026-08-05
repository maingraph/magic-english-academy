import { access, readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const output = resolve(import.meta.dirname, "../dist");
const indexPath = resolve(output, "index.html");

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return files.flat();
}

const outputFiles = await filesIn(output);
const textPaths = outputFiles.filter((path) => /\.(?:html|js|css)$/.test(path));
const textFiles = await Promise.all(textPaths.map(async (path) => ({ path, content: await readFile(path, "utf8") })));
const htmlPaths = outputFiles.filter((path) => path.endsWith(".html"));
const pages = await Promise.all(htmlPaths.map(async (path) => ({ path, html: await readFile(path, "utf8") })));
const html = pages.find((page) => page.path === indexPath)?.html ?? "";

if (textFiles.some((file) => /__[A-Z_]+__/.test(file.content))) throw new Error("Unresolved deployment placeholder");
if (!html.includes('rel="canonical"')) throw new Error("Canonical URL missing");
if (!html.includes("/login")) throw new Error("Platform login link missing");

const localReferences = [];
for (const page of pages) {
  const references = [...page.html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)]
    .map((match) => match[1])
    .filter((value) => !/^(?:https?:|mailto:|tel:|data:)/.test(value));
  for (const reference of references) {
    localReferences.push(reference);
    const pathname = reference.split(/[?#]/)[0];
    if (!pathname || pathname === "/") continue;
    const cleanPath = pathname.replace(/^\//, "");
    const candidates = pathname.startsWith("/")
      ? [resolve(output, cleanPath), resolve(output, `${cleanPath}.html`), resolve(output, cleanPath, "index.html")]
      : [resolve(dirname(page.path), pathname), resolve(dirname(page.path), `${pathname}.html`)];
    let found = false;
    for (const filePath of candidates) {
      if (await access(filePath).then(() => true).catch(() => false)) {
        found = true;
        break;
      }
    }
    if (!found) throw new Error(`Missing local asset: ${reference}`);
  }
}

console.log(`Validated ${new Set(localReferences).size} landing references`);
