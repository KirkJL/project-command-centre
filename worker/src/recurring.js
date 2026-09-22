"use strict";
import {json,badRequest,readJson,normalizeString} from "./http.js";
import {requireSession,requireMutation} from "./auth.js";

const PRIORITIES=new Set(["low","normal","high","critical"]);
export async function recurringTasks(request,env,id=null){
  const auth=request.method==="GET"?{session:await requireSession(request,env)}
    :await requireMutation(request,env);
  if(auth.error)return auth.error;
  if(!auth.session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const userId=auth.session.user.id;
  if(request.method==="GET"){
    const rows=await env.DB.prepare(`SELECT r.id,r.project_id,r.title,r.priority,r.interval_days,
      r.next_due_at,r.is_active,p.name AS project_name FROM recurring_tasks r
      JOIN projects p ON p.id=r.project_id WHERE r.user_id=? ORDER BY r.is_active DESC,r.next_due_at LIMIT 200`)
      .bind(userId).all();
    return json({ok:true,templates:rows.results||[]},200,request);
  }
  const body=await readJson(request);if(!body)return badRequest(request,"INVALID_JSON");
  if(request.method==="POST"){
    const projectId=Number(body.projectId),intervalDays=Number(body.intervalDays);
    const title=normalizeString(body.title,200),priority=normalizeString(body.priority,20)||"normal";
    const dueAt=Date.parse(body.nextDueAt);
    if(!Number.isSafeInteger(projectId)||projectId<1||!Number.isSafeInteger(intervalDays)||
      intervalDays<1||intervalDays>365||!title||!PRIORITIES.has(priority)||!Number.isFinite(dueAt))
      return badRequest(request,"INVALID_RECURRENCE");
    const project=await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=? AND status!='archived'")
      .bind(projectId,userId).first();
    if(!project)return badRequest(request,"PROJECT_NOT_FOUND");
    const result=await env.DB.prepare(`INSERT INTO recurring_tasks
      (user_id,project_id,title,priority,interval_days,next_due_at) VALUES (?,?,?,?,?,?)`)
      .bind(userId,projectId,title,priority,intervalDays,new Date(dueAt).toISOString()).run();
    return json({ok:true,id:Number(result.meta.last_row_id)},201,request);
  }
  if(request.method==="PATCH"&&Number.isSafeInteger(id)&&id>0){
    if(typeof body.isActive!=="boolean")return badRequest(request,"IS_ACTIVE_REQUIRED");
    const result=await env.DB.prepare(`UPDATE recurring_tasks SET is_active=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND user_id=?`).bind(body.isActive?1:0,id,userId).run();
    return Number(result.meta?.changes||0)?json({ok:true},200,request):json({ok:false,error:"RECURRENCE_NOT_FOUND"},404,request);
  }
  return json({ok:false,error:"METHOD_NOT_ALLOWED"},405,request);
}

export async function processRecurringTasks(env){
  const due=await env.DB.prepare(`SELECT * FROM recurring_tasks WHERE is_active=1
    AND datetime(next_due_at)<=datetime('now') ORDER BY next_due_at LIMIT 20`).all();
  let created=0;
  for(const template of due.results||[]){
    try{
      const dueAt=template.next_due_at;
      await env.DB.prepare(`INSERT OR IGNORE INTO recurring_task_runs(template_id,due_at) VALUES (?,?)`)
        .bind(template.id,dueAt).run();
      const run=await env.DB.prepare(`SELECT id,task_id FROM recurring_task_runs WHERE template_id=? AND due_at=?`)
        .bind(template.id,dueAt).first();
      if(!run.task_id){
        await env.DB.prepare(`INSERT OR IGNORE INTO tasks(user_id,project_id,title,status,priority,due_at,recurrence_run_id)
          VALUES (?,?,?,'todo',?,?,?)`).bind(template.user_id,template.project_id,
            template.title,template.priority,dueAt,run.id).run();
        const task=await env.DB.prepare("SELECT id FROM tasks WHERE recurrence_run_id=?")
          .bind(run.id).first();
        await env.DB.prepare("UPDATE recurring_task_runs SET task_id=? WHERE id=? AND task_id IS NULL")
          .bind(task.id,run.id).run();
        created++;
      }
      const next=new Date(Date.parse(dueAt)+template.interval_days*86400000).toISOString();
      await env.DB.prepare(`UPDATE recurring_tasks SET next_due_at=?,updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND next_due_at=?`).bind(next,template.id,dueAt).run();
    }catch(error){console.error("Recurring task failed",template.id,error)}
  }
  return created;
}
