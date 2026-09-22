"use strict";
import {json,badRequest,readJson,normalizeString,safeJson} from "./http.js";
import {requireSession,requireMutation} from "./auth.js";

const NAME=/^[A-Za-z0-9_.-]{1,100}$/;
async function githubFetch(env,path){
  const headers={Accept:"application/vnd.github+json","User-Agent":"Project-Hub"};
  if(env.GITHUB_TOKEN)headers.Authorization=`Bearer ${env.GITHUB_TOKEN}`;
  return fetch(`https://api.github.com${path}`,{headers,redirect:"manual"});
}
export async function githubRepos(request,env){
  const auth=request.method==="GET"?{session:await requireSession(request,env)}:await requireMutation(request,env);
  if(auth.error)return auth.error;
  if(!auth.session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const userId=auth.session.user.id;
  if(request.method==="GET"){
    const rows=await env.DB.prepare(`SELECT r.id,r.project_id,r.owner,r.repo,p.name AS project_name
      FROM project_github_repos r JOIN projects p ON p.id=r.project_id
      WHERE r.user_id=? ORDER BY p.name,r.owner,r.repo`).bind(userId).all();
    return json({ok:true,repositories:rows.results||[],authenticated:Boolean(env.GITHUB_TOKEN)},200,request);
  }
  const body=await readJson(request);if(!body)return badRequest(request,"INVALID_JSON");
  const projectId=Number(body.projectId),owner=normalizeString(body.owner,100),repo=normalizeString(body.repo,100);
  if(!Number.isSafeInteger(projectId)||projectId<1||!NAME.test(owner)||!NAME.test(repo))
    return badRequest(request,"INVALID_REPOSITORY");
  const project=await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=? AND status!='archived'")
    .bind(projectId,userId).first();
  if(!project)return badRequest(request,"PROJECT_NOT_FOUND");
  const response=await githubFetch(env,`/repos/${owner}/${repo}`);
  if(!response.ok)return json({ok:false,error:response.status===404?"REPOSITORY_NOT_FOUND":"GITHUB_UNAVAILABLE"},
    response.status===404?404:502,request);
  const metadata=await safeJson(response);
  if(metadata?.full_name?.toLowerCase()!==`${owner}/${repo}`.toLowerCase())
    return badRequest(request,"REPOSITORY_MISMATCH");
  const result=await env.DB.prepare(`INSERT OR IGNORE INTO project_github_repos(user_id,project_id,owner,repo)
    VALUES (?,?,?,?)`).bind(userId,projectId,owner,repo).run();
  return json({ok:true,created:Number(result.meta?.changes||0)===1},200,request);
}
export async function githubIssues(request,env,id){
  const session=await requireSession(request,env);
  if(!session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const row=await env.DB.prepare("SELECT owner,repo FROM project_github_repos WHERE id=? AND user_id=?")
    .bind(id,session.user.id).first();
  if(!row)return json({ok:false,error:"REPOSITORY_NOT_FOUND"},404,request);
  const response=await githubFetch(env,`/repos/${row.owner}/${row.repo}/issues?state=open&per_page=30`);
  if(!response.ok)return json({ok:false,error:response.status===403?"GITHUB_RATE_LIMIT_OR_PERMISSION":"GITHUB_UNAVAILABLE"},502,request);
  const data=await safeJson(response);
  if(!Array.isArray(data))return json({ok:false,error:"GITHUB_RESPONSE_INVALID"},502,request);
  return json({ok:true,issues:data.map(item=>({number:item.number,title:item.title,
    url:item.html_url,state:item.state,kind:item.pull_request?"pull_request":"issue",
    updatedAt:item.updated_at})),authenticated:Boolean(env.GITHUB_TOKEN)},200,request);
}
