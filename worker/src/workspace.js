"use strict";
import {json,badRequest,readJson,normalizeString} from "./http.js";
import {requireSession,requireMutation} from "./auth.js";
import {writeAudit} from "./audit.js";

const states=new Set(["backlog","todo","in_progress","done","cancelled"]);
const priorities=new Set(["low","normal","high","critical"]);
function dateValue(value){if(!value)return null;const n=Date.parse(value);return Number.isFinite(n)?new Date(n).toISOString():undefined;}
async function owner(request,env,mutate=false){
  if(mutate)return requireMutation(request,env);
  const session=await requireSession(request,env);
  return session?{session}:{error:json({ok:false,error:"UNAUTHENTICATED"},401,request)};
}
export async function tasks(request,env,id=null){
  const auth=await owner(request,env,request.method!=="GET");
  if(auth.error)return auth.error;
  const userId=auth.session.user.id;
  if(request.method==="GET"){
    const projectId=Number(new URL(request.url).searchParams.get("projectId"));
    const result=await env.DB.prepare(`SELECT tasks.id,tasks.project_id,tasks.title,tasks.status,tasks.priority,tasks.due_at,
      projects.name AS project_name FROM tasks LEFT JOIN projects ON projects.id=tasks.project_id
      WHERE tasks.user_id=? AND (?=0 OR tasks.project_id=?) ORDER BY
      CASE tasks.status WHEN 'done' THEN 2 WHEN 'cancelled' THEN 3 ELSE 1 END,
      tasks.due_at IS NULL,tasks.due_at,tasks.id DESC LIMIT 500`)
      .bind(userId,Number.isSafeInteger(projectId)?projectId:0,Number.isSafeInteger(projectId)?projectId:0).all();
    return json({ok:true,tasks:result.results||[]},200,request);
  }
  const body=await readJson(request);if(!body)return badRequest(request,"INVALID_JSON");
  const title=normalizeString(body.title,200);
  const status=body.status===undefined?"todo":normalizeString(body.status,30).toLowerCase();
  const priority=body.priority===undefined?"normal":normalizeString(body.priority,30).toLowerCase();
  const dueAt=dateValue(body.dueAt);
  if(!states.has(status)||!priorities.has(priority)||dueAt===undefined)return badRequest(request,"INVALID_TASK_FIELDS");
  if(request.method==="POST"){
    const projectId=Number(body.projectId);
    if(!title||!Number.isSafeInteger(projectId)||projectId<1)return badRequest(request,"TITLE_AND_PROJECT_REQUIRED");
    const project=await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=? AND status!='archived'").bind(projectId,userId).first();
    if(!project)return badRequest(request,"PROJECT_NOT_FOUND");
    const result=await env.DB.prepare(`INSERT INTO tasks (user_id,project_id,title,status,priority,due_at)
      VALUES (?,?,?,?,?,?)`).bind(userId,projectId,title,status,priority,dueAt).run();
    await writeAudit(env,userId,"TASK_CREATED","task",String(result.meta.last_row_id),request);
    return json({ok:true,id:Number(result.meta.last_row_id)},201,request);
  }
  if(request.method==="PATCH"&&Number.isSafeInteger(id)&&id>0){
    const row=await env.DB.prepare("SELECT id,title,status,priority,due_at FROM tasks WHERE id=? AND user_id=?").bind(id,userId).first();
    if(!row)return json({ok:false,error:"TASK_NOT_FOUND"},404,request);
    const nextTitle=body.title===undefined?row.title:title;
    if(!nextTitle)return badRequest(request,"TITLE_REQUIRED");
    const result=await env.DB.prepare(`UPDATE tasks SET title=?,status=?,priority=?,due_at=? WHERE id=? AND user_id=?`)
      .bind(nextTitle,body.status===undefined?row.status:status,body.priority===undefined?row.priority:priority,
        body.dueAt===undefined?row.due_at:dueAt,id,userId).run();
    await writeAudit(env,userId,"TASK_UPDATED","task",String(id),request);
    return json({ok:true,changed:Number(result.meta?.changes||0)},200,request);
  }
  return json({ok:false,error:"METHOD_NOT_ALLOWED"},405,request);
}
export async function library(request,env){
  const auth=await owner(request,env);if(auth.error)return auth.error;
  const url=new URL(request.url);const q=normalizeString(url.searchParams.get("q"),100);
  const projectId=Number(url.searchParams.get("projectId"))||0;
  const rows=await env.DB.prepare(`SELECT content.id,content.project_id,content.title,content.description,
    content.content_type,content.status,content.updated_at,projects.name AS project_name,
    (SELECT COUNT(*) FROM publication_jobs p WHERE p.content_id=content.id AND p.user_id=content.user_id) AS publication_count
    FROM content JOIN projects ON projects.id=content.project_id WHERE content.user_id=?
    AND (?=0 OR content.project_id=?) AND (content.title LIKE ? OR content.description LIKE ?
      OR EXISTS(SELECT 1 FROM content_tags t WHERE t.user_id=content.user_id
        AND t.content_id=content.id AND t.tag LIKE ?))
    ORDER BY content.updated_at DESC LIMIT 250`)
    .bind(auth.session.user.id,projectId,projectId,`%${q}%`,`%${q}%`,`%${q}%`).all();
  return json({ok:true,items:rows.results||[]},200,request);
}
export async function planner(request,env){
  const auth=await owner(request,env);if(auth.error)return auth.error;
  const userId=auth.session.user.id;
  const [taskRows,jobRows]=await Promise.all([
    env.DB.prepare(`SELECT id,title,due_at,priority,status,project_id FROM tasks WHERE user_id=?
      AND status NOT IN ('done','cancelled') AND due_at IS NOT NULL
      AND datetime(due_at)<=datetime('now','+7 days') ORDER BY due_at LIMIT 100`).bind(userId).all(),
    env.DB.prepare(`SELECT id,title,platform,scheduled_at,publish_state,project_id FROM publication_jobs WHERE user_id=?
      AND publish_state IN ('queued','retrying','processing') AND scheduled_at IS NOT NULL
      AND datetime(scheduled_at)<=datetime('now','+7 days') ORDER BY scheduled_at LIMIT 100`).bind(userId).all()
  ]);
  return json({ok:true,tasks:taskRows.results||[],publications:jobRows.results||[]},200,request);
}
export async function analytics(request,env){
  const auth=await owner(request,env);if(auth.error)return auth.error;
  const userId=auth.session.user.id;
  const [states,platforms,tasksByState,topVideos,postingHours]=await Promise.all([
    env.DB.prepare("SELECT publish_state AS label,COUNT(*) AS total FROM publication_jobs WHERE user_id=? GROUP BY publish_state").bind(userId).all(),
    env.DB.prepare("SELECT platform AS label,COUNT(*) AS total FROM publication_jobs WHERE user_id=? AND publish_state='published' GROUP BY platform").bind(userId).all(),
    env.DB.prepare("SELECT status AS label,COUNT(*) AS total FROM tasks WHERE user_id=? GROUP BY status").bind(userId).all(),
    env.DB.prepare(`SELECT p.id,p.title,p.external_post_url,m.views,m.likes,m.comments,m.collected_date
      FROM publication_jobs p JOIN publication_metrics m ON m.publication_job_id=p.id
      WHERE p.user_id=? AND m.collected_date=(SELECT MAX(x.collected_date) FROM publication_metrics x
        WHERE x.publication_job_id=p.id) ORDER BY m.views DESC LIMIT 20`).bind(userId).all(),
    env.DB.prepare(`SELECT strftime('%H',published_at) AS hour_utc,COUNT(*) AS total
      FROM publication_jobs WHERE user_id=? AND publish_state='published'
      AND published_at IS NOT NULL GROUP BY hour_utc ORDER BY hour_utc`).bind(userId).all()
  ]);
  return json({ok:true,publicationStates:states.results||[],publishedByPlatform:platforms.results||[],taskStates:tasksByState.results||[],
    topVideos:topVideos.results||[],postingHoursUtc:postingHours.results||[],
    note:"YouTube engagement figures are daily provider snapshots. TikTok and Instagram engagement metrics are unavailable with the current permissions. Posting hours use UTC."},200,request);
}
