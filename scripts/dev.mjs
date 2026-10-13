import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./database.mjs";
import worker from "../worker/worker.js";

mkdirSync(new URL("../.local/",import.meta.url),{recursive:true});
const DB = openDatabase(process.env.LOCAL_DB_PATH || fileURLToPath(new URL("../.local/project-hub.sqlite",import.meta.url)));
const port = Number(process.env.PORT || 8787);
const env = {DB,ALLOW_REGISTRATION:"true"};
const types = {html:"text/html; charset=utf-8",js:"text/javascript; charset=utf-8",css:"text/css; charset=utf-8"};
const server = createServer(async (req,res) => {
  try {
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "")) {
      res.writeHead(403);res.end("Invalid host");return;
    }
    const url = new URL(req.url,"http://"+req.headers.host);
    if (url.pathname.startsWith("/api/")) {
      const headers = new Headers();
      for (const [key,value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key,String(value));
      headers.set("CF-Connecting-IP", req.socket.remoteAddress || "local");
      const request = new Request(url,{method:req.method,headers,
        ...(!["GET","HEAD"].includes(req.method) ? {body:req,duplex:"half"} : {})});
      const response = await worker.fetch(request,env,{});
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    // Only public assets can be served. Never expose database files or Worker source.
    if (!/^(index\.html|login\.html|(?:js|css)\/[a-zA-Z0-9_-]+\.(?:js|css))$/.test(path)) {
      res.writeHead(404); res.end("Not found"); return;
    }
    const data = await readFile(new URL("../"+path,import.meta.url));
    res.writeHead(200,{"Content-Type":types[path.split(".").pop()],"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
    res.end(data);
  } catch (error) {
    console.error(error);
    res.writeHead(error.code === "ENOENT" ? 404 : 500); res.end("Unable to serve request");
  }
});
server.listen(8787,"127.0.0.1",()=>console.log("Project Hub: http://localhost:8787 — create an account to begin."));
let running = false;
const timer = setInterval(async () => {
  if (running) return;
  running = true;
  try {
    const pending=[];
    await worker.scheduled({scheduledTime:Date.now()},env,{waitUntil: promise => pending.push(promise)});
    await Promise.all(pending);
  } catch(error) { console.error("Local scheduled work failed",error); }
  finally { running = false; }
},300000);
timer.unref();
