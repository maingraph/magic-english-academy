import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "../dist");
const port = Number(process.env.PORT ?? 4173);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${request.headers.host}`).pathname);
    const requested = pathname === "/" ? "/index.html" : pathname;
    const filePath = resolve(root, `.${requested}`);
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) throw new Error("Invalid path");
    const details = await stat(filePath);
    if (!details.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Landing running on http://127.0.0.1:${port}`);
});
