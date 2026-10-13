import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { Script } from "node:vm";

test("all browser scripts parse and referenced local assets exist",()=>{
 for(const file of readdirSync("js")) new Script(readFileSync("js/"+file,"utf8"),{filename:file});
 for(const file of ["index.html","login.html"]) {
   const html=readFileSync(file,"utf8");
   for(const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g))assert.ok(existsSync(match[1]),`${file}: ${match[1]}`);
 }
 const html=readFileSync("index.html","utf8");
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 const script=readFileSync("js/app.js","utf8");
 for(const match of script.matchAll(/getElementById\(\s*["']([^"']+)/g))assert.ok(ids.has(match[1]),`Missing DOM ID: ${match[1]}`);
});
