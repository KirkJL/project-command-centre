import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../scripts/database.mjs";
import worker from "../worker/worker.js";
import { consumeOAuthState } from "../worker/src/oauth.js";
import { processRecurringTasks } from "../worker/src/recurring.js";

const origin="https://kirkjl.github.io";
function setup(t) {
  const env={DB:openDatabase(),ALLOW_REGISTRATION:"true"};t.after(()=>env.DB.close());
  async function call(path, {method="GET",body,cookie,csrf,requestOrigin=origin}={}) {
    const headers={Origin:requestOrigin};
    if(body!==undefined)headers["Content-Type"]="application/json";
    if(cookie)headers.Cookie=cookie;if(csrf)headers["X-CSRF-Token"]=csrf;
    const response=await worker.fetch(new Request("https://api.example.test"+path,{method,headers,
      ...(body!==undefined?{body:JSON.stringify(body)}:{})}),env,{});
    return {status:response.status,body:await response.json(),headers:response.headers};
  }
  async function account(username="alice", password="a long password with spaces ") {
    const created=await call("/api/auth/register",{method:"POST",body:{username,displayName:username,password}});
    assert.equal(created.status,201,JSON.stringify(created.body));
    const login=await call("/api/auth/login",{method:"POST",body:{username,password}});
    assert.equal(login.status,200,JSON.stringify(login.body));
    return {cookie:login.headers.get("set-cookie").split(";")[0],csrf:login.body.csrfToken};
  }
  return {env,call,account};
}

test("register, login, projects and tasks persist and enforce ownership",async t=>{
 const {call,account}=setup(t);const alice=await account();const bob=await account("bob");
 const p=await call("/api/projects",{...alice,method:"POST",body:{name:"Launch",projectType:"software"}});
 assert.equal(p.status,201);const projectId=p.body.id;
 const task=await call("/api/tasks",{...alice,method:"POST",body:{projectId,title:"Ship the app",priority:"high",dueAt:"2026-12-01T12:00:00Z"}});
 assert.equal(task.status,201,JSON.stringify(task.body));
 assert.equal((await call("/api/tasks",alice)).body.tasks[0].title,"Ship the app");
 assert.equal((await call("/api/tasks",bob)).body.tasks.length,0);
 assert.equal((await call(`/api/tasks/${task.body.id}`,{...bob,method:"PATCH",body:{status:"done"}})).status,404);
 assert.equal((await call("/api/tasks",{...bob,method:"POST",body:{projectId,title:"Intrude"}})).status,400);
 assert.equal((await call(`/api/tasks/${task.body.id}`,{cookie:alice.cookie,method:"PATCH",body:{status:"done"}})).status,403);
 assert.equal((await call(`/api/tasks/${task.body.id}`,{...alice,method:"PATCH",body:{status:"done",title:"Shipped",dueAt:null}})).status,200);
 const updated=(await call("/api/tasks",alice)).body.tasks[0];assert.equal(updated.status,"done");assert.equal(updated.title,"Shipped");assert.equal(updated.due_at,null);
 const dashboard=await call("/api/dashboard",alice);assert.equal(dashboard.body.projects.length,1);
 assert.equal((await call("/api/dashboard",bob)).body.projects.length,0);
 assert.equal((await call("/api/auth/logout",{...alice,method:"POST",body:{}})).status,200);
 assert.equal((await call("/api/tasks",alice)).status,401);
});

test("every read endpoint executes against the installation schema",async t=>{
 const {call,account}=setup(t);const auth=await account();
 for(const path of ["/api/auth/me","/api/dashboard","/api/projects","/api/content","/api/ideas","/api/accounts","/api/calendar","/api/publications","/api/media","/api/tasks","/api/recurring-tasks","/api/library","/api/planner","/api/analytics","/api/brands","/api/github/repos","/api/notifications","/api/integrations","/api/settings/audit"]){
  const result=await call(path,auth);assert.equal(result.status,200,`${path}: ${JSON.stringify(result.body)}`);
  assert.equal((await call(path)).status,401,path);
 }
});

test("routing rejects untrusted origins, invalid IDs and unexpected methods",async t=>{
 const {call}=setup(t);
 assert.equal((await call("/api/auth/login",{method:"POST",requestOrigin:"https://evil.test",body:{}})).status,403);
 assert.equal((await call("/api/auth/login")).status,405);
 assert.equal((await call("/api/tasks/9007199254740992",{method:"PATCH"})).status,400);
 assert.equal((await call("/api/missing")).status,404);
});

test("registration validation, uniqueness and disabled registration",async t=>{
 const {call,account,env}=setup(t);await account();
 assert.equal((await call("/api/auth/register",{method:"POST",body:{username:"alice",displayName:"A",password:"long-password-123"}})).status,409);
 assert.equal((await call("/api/auth/register",{method:"POST",body:{username:"charlie",displayName:"C",password:"short"}})).status,400);
 env.ALLOW_REGISTRATION="false";
 assert.equal((await call("/api/auth/register",{method:"POST",body:{}})).status,403);
});

test("password change revokes other sessions and preserves literal whitespace",async t=>{
 const {call,account}=setup(t);const first=await account();
 const second=await call("/api/auth/login",{method:"POST",body:{username:"alice",password:"a long password with spaces "}});
 const other={cookie:second.headers.get("set-cookie").split(";")[0]};
 const changed=await call("/api/settings/password",{...first,method:"POST",body:{currentPassword:"a long password with spaces ",newPassword:" new password with spaces "}});
 assert.equal(changed.status,200);assert.equal((await call("/api/auth/me",other)).status,401);assert.equal((await call("/api/auth/me",first)).status,200);
 assert.equal((await call("/api/auth/login",{method:"POST",body:{username:"alice",password:" new password with spaces "}})).status,200);
});

test("OAuth state is atomically consumed once",async t=>{
 const {call,account,env}=setup(t);const auth=await account();
 const project=await call("/api/projects",{...auth,method:"POST",body:{name:"OAuth"}});
 await env.DB.prepare("INSERT INTO oauth_states(id,user_id,provider,project_id,expires_at) VALUES ('state',1,'youtube',?,?)").bind(project.body.id,new Date(Date.now()+60000).toISOString()).run();
 const results=await Promise.all([consumeOAuthState(env,"state","youtube"),consumeOAuthState(env,"state","youtube")]);
 assert.equal(results.filter(Boolean).length,1);
});

test("recurring tasks generate one task per due occurrence",async t=>{
 const {call,account,env}=setup(t);const auth=await account();const project=await call("/api/projects",{...auth,method:"POST",body:{name:"Repeat"}});
 const created=await call("/api/recurring-tasks",{...auth,method:"POST",body:{projectId:project.body.id,title:"Review",intervalDays:7,nextDueAt:new Date(Date.now()-60000).toISOString()}});
 assert.equal(created.status,201);await processRecurringTasks(env);await processRecurringTasks(env);
 assert.equal((await call("/api/tasks",auth)).body.tasks.length,1);
});

test("content, ideas, brands and library actions work with ownership checks",async t=>{
 const {call,account}=setup(t);const auth=await account();const other=await account("bob");
 const projectId=(await call("/api/projects",{...auth,method:"POST",body:{name:"Content"}})).body.id;
 const content=await call("/api/content",{...auth,method:"POST",body:{projectId,title:"Video",contentType:"video",status:"idea"}});assert.equal(content.status,201);
 const id=content.body.id;
 assert.equal((await call(`/api/content/${id}/publishing`,auth)).status,200);
 assert.equal((await call(`/api/content/${id}/status`,{...auth,method:"PATCH",body:{status:"ready"}})).status,200);
 assert.equal((await call("/api/ideas",{...auth,method:"POST",body:{projectId,title:"New idea"}})).status,201);
 const brand=await call("/api/brands",{...auth,method:"POST",body:{projectId,name:"Brand"}});assert.equal(brand.status,201);
 assert.equal((await call(`/api/content/${id}/brand`,{...auth,method:"PATCH",body:{groupId:brand.body.id}})).status,200);
 assert.equal((await call(`/api/library/${id}`,{...auth,method:"POST",body:{action:"addTag",tag:"launch"}})).status,200);
 assert.equal((await call(`/api/library/${id}`,auth)).body.tags[0].tag,"launch");
 assert.equal((await call(`/api/library/${id}`,other)).status,404);
 assert.equal((await call(`/api/assistant/context?projectId=${projectId}`,auth)).status,200);
});

test("concurrent login attempts cannot bypass the database quota",async t=>{
 const {call,account}=setup(t);await account();
 const results=await Promise.all(Array.from({length:8},()=>call("/api/auth/login",{method:"POST",body:{username:"alice",password:"wrong"}})));
 assert.equal(results.filter(r=>r.status===401).length,5);
 assert.equal(results.filter(r=>r.status===429).length,3);
});

test("new accounts cannot use another user's private GitHub token",async t=>{
 const {call,account,env}=setup(t);const auth=await account();
 env.GITHUB_TOKEN="test-owner-token";env.GITHUB_TOKEN_USER_ID="999";
 assert.equal((await call("/api/github/repos",auth)).body.authenticated,false);
 assert.equal((await call("/api/integrations",auth)).body.integrations.github.configured,false);
});

test("malformed and oversized JSON is rejected",async t=>{
 const {env}=setup(t);
 for(const body of ["{", "[]", "null", JSON.stringify({padding:"x".repeat(1024*1024)})]) {
   const response=await worker.fetch(new Request("https://api.example.test/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body}),env,{});
   assert.equal(response.status,400);
 }
});
