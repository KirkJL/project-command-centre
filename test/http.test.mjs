import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";

test("HTTP server serves the app and persists accounts and tasks across restart",async t=>{
 const directory=await mkdtemp(join(tmpdir(),"project-hub-test-"));
 let process;
 async function start(){
   process=spawn(globalThis.process.execPath,["scripts/dev.mjs"],{env:{...globalThis.process.env,PORT:"0",LOCAL_DB_PATH:join(directory,"test.sqlite")},stdio:["ignore","pipe","pipe"]});
   return new Promise((resolve,reject)=>{
     process.once("error",reject);process.once("exit",code=>reject(Error("Server exited "+code)));
     process.stdout.on("data",chunk=>{const match=String(chunk).match(/http:\/\/localhost:\d+/);if(match)resolve(match[0]);});
   });
 }
 async function stop(){if(process?.exitCode===null){const ended=once(process,"exit");process.kill();await ended;}}
 t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
 let base=await start();
 async function api(path,method="GET",body,auth={}){
   const response=await fetch(base+path,{method,headers:{Origin:base,...auth,...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});
   return {status:response.status,data:await response.json(),headers:response.headers};
 }
 for(const path of ["/","/login.html","/js/app.js","/js/workspace.js","/js/login.js","/css/workspace.css"]){assert.equal((await fetch(base+path)).status,200,path);}
 assert.equal((await fetch(base+"/worker/src/auth.js")).status,404);
 assert.equal((await api("/api/health")).status,200);
 assert.equal((await api("/api/auth/register","POST",{username:"smoke",displayName:"Smoke test",password:"test-password-123"})).status,201);
 const login=await api("/api/auth/login","POST",{username:"smoke",password:"test-password-123"});assert.equal(login.status,200);
 assert.match(login.headers.get("set-cookie"),/HttpOnly; Secure;/);
 const auth={Cookie:login.headers.get("set-cookie").split(";")[0],"X-CSRF-Token":login.data.csrfToken};
 const project=await api("/api/projects","POST",{name:"Persisted project"},auth);assert.equal(project.status,201);
 assert.equal((await api("/api/tasks","POST",{projectId:project.data.id,title:"Persisted task"},auth)).status,201);
 await stop();base=await start();
 const result=await api("/api/tasks","GET",undefined,auth);assert.equal(result.status,200);assert.equal(result.data.tasks[0].title,"Persisted task");
});
