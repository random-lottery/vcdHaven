
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { extname, join } from "https://deno.land/std@0.200.0/path/mod.ts";

const PORT = 8000;
const STATIC_DIR = "./";

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

async function serveStatic(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let pathname = join(STATIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);

  try {
    const fileInfo = await Deno.stat(pathname);
    if (fileInfo.isDirectory) {
      pathname = join(pathname, "index.html");
    }

    const file = await Deno.readFile(pathname);
    const ext = extname(pathname);
    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new Response(file, {
      headers: { "Content-Type": contentType },
      status: 200
    });
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return new Response("File not found", { status: 404 });
    }
    return new Response("Server error", { status: 500 });
  }
}

const router = (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/static/") || url.pathname === "/") {
    return serveStatic(req);
  }
  return Promise.resolve(new Response("Not Found", { status: 404 }));
};

console.log(`Server running at http://localhost:${PORT}`);
await serve(router, { port: PORT });
