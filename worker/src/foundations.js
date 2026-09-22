"use strict";
import {json,badRequest} from "./http.js";
import {requireSession} from "./auth.js";

export async function notifications(request,env){
  const session=await requireSession(request,env);
  if(!session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const userId=session.user.id;
  const [tasks,jobs]=await Promise.all([
    env.DB.prepare(`SELECT id,title,due_at FROM tasks WHERE user_id=?
      AND status NOT IN ('done','cancelled') AND due_at IS NOT NULL
      AND datetime(due_at)<datetime('now') ORDER BY due_at LIMIT 30`).bind(userId).all(),
    env.DB.prepare(`SELECT id,title,platform,last_error FROM publication_jobs WHERE user_id=?
      AND publish_state='failed' ORDER BY updated_at DESC LIMIT 30`).bind(userId).all()
  ]);
  return json({ok:true,items:[
    ...(tasks.results||[]).map(t=>({type:"overdue_task",id:t.id,title:t.title,detail:t.due_at})),
    ...(jobs.results||[]).map(j=>({type:"failed_publication",id:j.id,title:j.title||j.platform,detail:j.last_error}))
  ]},200,request);
}
export async function assistantContext(request,env){
  const session=await requireSession(request,env);
  if(!session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const projectId=Number(new URL(request.url).searchParams.get("projectId"));
  if(!Number.isSafeInteger(projectId)||projectId<1)return badRequest(request,"PROJECT_ID_REQUIRED");
  const project=await env.DB.prepare(`SELECT id,name,project_type,status FROM projects WHERE id=? AND user_id=?`)
    .bind(projectId,session.user.id).first();
  if(!project)return json({ok:false,error:"PROJECT_NOT_FOUND"},404,request);
  const [tasks,content,publications]=await Promise.all([
    env.DB.prepare(`SELECT id,title,status,priority,due_at FROM tasks WHERE project_id=? AND user_id=?
      AND status NOT IN ('done','cancelled') ORDER BY due_at LIMIT 30`).bind(projectId,session.user.id).all(),
    env.DB.prepare(`SELECT id,title,status,content_type,description FROM content WHERE project_id=? AND user_id=?
      AND status!='archived' ORDER BY updated_at DESC LIMIT 30`).bind(projectId,session.user.id).all(),
    env.DB.prepare(`SELECT id,title,platform,publish_state,scheduled_at,last_error FROM publication_jobs
      WHERE project_id=? AND user_id=? ORDER BY updated_at DESC LIMIT 30`).bind(projectId,session.user.id).all()
  ]);
  return json({ok:true,project,tasks:tasks.results||[],content:content.results||[],
    publications:publications.results||[],modelConnected:false,
    note:"Project context only. No AI model is configured or called."},200,request);
}
export async function integrationStatus(request,env){
  const session=await requireSession(request,env);
  if(!session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const accounts=await env.DB.prepare(`SELECT a.platform,COUNT(*) AS total FROM social_accounts a
    JOIN oauth_credentials c ON c.social_account_id=a.id WHERE a.user_id=? GROUP BY a.platform`)
    .bind(session.user.id).all();
  const repos=await env.DB.prepare("SELECT COUNT(*) AS total FROM project_github_repos WHERE user_id=?")
    .bind(session.user.id).first();
  const connected=Object.fromEntries((accounts.results||[]).map(r=>[r.platform,Number(r.total)]));
  return json({ok:true,integrations:{
    tiktok:{connected:connected.tiktok||0,configured:Boolean(env.TIKTOK_CLIENT_KEY),
      note:"Direct posting requires TikTok app approval and video.publish scope."},
    youtube:{connected:connected.youtube||0,configured:Boolean(env.GOOGLE_CLIENT_ID),
      note:"Public uploads from unverified Google API projects may be restricted to private."},
    instagram:{connected:0,configured:false,
      note:"Requires a Meta app, approved permissions, professional account and accessible media URL. Publishing is unavailable."},
    github:{connected:Number(repos?.total||0),configured:Boolean(env.GITHUB_TOKEN),note:"Read-only repository issues work for public repositories. A Worker GITHUB_TOKEN secret is needed for private repositories and higher API limits."},
    assistant:{connected:0,configured:false,note:"Project context endpoint is available; no model connection or action execution is configured."}
  }},200,request);
}
