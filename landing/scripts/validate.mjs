import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const output = resolve(import.meta.dirname, "../dist");
const indexPath = resolve(output, "index.html");
const html = await readFile(indexPath, "utf8");

if (/__[A-Z_]+__/.test(html)) throw new Error("Unresolved deployment placeholder");
if (!html.includes('rel="canonical"')) throw new Error("Canonical URL missing");
if (!html.includes("/login")) throw new Error("Platform login link missing");

const localReferences = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)]
  .map((match) => match[1])
  .filter((value) => !/^(?:https?:|mailto:|tel:|data:)/.test(value));

for (const reference of new Set(localReferences)) {
  const pathname = reference.split(/[?#]/)[0];
  if (!pathname || pathname === "/") continue;
  const filePath = pathname.startsWith("/")
    ? resolve(output, `.${pathname}`)
    : resolve(dirname(indexPath), pathname);
  await access(filePath).catch(() => {
    throw new Error(`Missing local asset: ${reference}`);
  });
}

console.log(`Validated ${new Set(localReferences).size} landing references`);
