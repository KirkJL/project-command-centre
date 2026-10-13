"use strict";
import {json,badRequest,readJson,normalizeString} from "./http.js";
import {requireSession,requireMutation} from "./auth.js";
import {writeAudit} from "./audit.js";

export async function brandGroups(request,env){
  const auth=request.method==="GET"?{session:await requireSession(request,env)}:await requireMutation(request,env);
  if(auth.error)return auth.error;
  if(!auth.session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const userId=auth.session.user.id;
  if(request.method==="GET"){
    const [groups,accounts,items]=await Promise.all([
      env.DB.prepare(`SELECT g.id,g.project_id,g.name,p.name AS project_name FROM brand_groups g
        JOIN projects p ON p.id=g.project_id WHERE g.user_id=? ORDER BY p.name,g.name`).bind(userId).all(),
      env.DB.prepare(`SELECT id,project_id,account_name,platform,brand_group_id FROM social_accounts
        WHERE user_id=? ORDER BY account_name`).bind(userId).all(),
      env.DB.prepare(`SELECT id,project_id,title,brand_group_id FROM content WHERE user_id=?
        AND status!='archived' ORDER BY updated_at DESC LIMIT 250`).bind(userId).all()
    ]);
    return json({ok:true,groups:groups.results||[],accounts:accounts.results||[],content:items.results||[]},200,request);
  }
  const body=await readJson(request);if(!body)return badRequest(request,"INVALID_JSON");
  const projectId=Number(body.projectId),name=normalizeString(body.name,100);
  if(!Number.isSafeInteger(projectId)||projectId<1||!name)return badRequest(request,"INVALID_BRAND_GROUP");
  const project=await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=? AND status!='archived'")
    .bind(projectId,userId).first();
  if(!project)return badRequest(request,"PROJECT_NOT_FOUND");
  const result=await env.DB.prepare("INSERT INTO brand_groups(user_id,project_id,name) VALUES (?,?,?)")
    .bind(userId,projectId,name).run();
  await writeAudit(env,userId,"BRAND_GROUP_CREATED","brand_group",String(result.meta.last_row_id),request);
  return json({ok:true,id:Number(result.meta.last_row_id)},201,request);
}
export async function assignBrand(request,env,type,id){
  const auth=await requireMutation(request,env);if(auth.error)return auth.error;
  const body=await readJson(request);if(!body)return badRequest(request,"INVALID_JSON");
  const groupId=body.groupId===null?null:Number(body.groupId);
  if(groupId!==null&&(!Number.isSafeInteger(groupId)||groupId<1))return badRequest(request,"INVALID_BRAND_GROUP");
  const table=type==="account"?"social_accounts":"content",userId=auth.session.user.id;
  const item=await env.DB.prepare(`SELECT id,project_id FROM ${table} WHERE id=? AND user_id=?`)
    .bind(id,userId).first();
  if(!item)return json({ok:false,error:"ITEM_NOT_FOUND"},404,request);
  if(groupId!==null){
    const group=await env.DB.prepare("SELECT id FROM brand_groups WHERE id=? AND user_id=? AND project_id=?")
      .bind(groupId,userId,item.project_id).first();
    if(!group)return badRequest(request,"BRAND_PROJECT_MISMATCH");
  }
  await env.DB.prepare(`UPDATE ${table} SET brand_group_id=? WHERE id=? AND user_id=?`)
    .bind(groupId,id,userId).run();
  await writeAudit(env,userId,"BRAND_ASSIGNED",type,String(id),request);
  return json({ok:true},200,request);
}
export function brandsMatch(contentGroup,accountGroup){
  return (contentGroup===null||contentGroup===undefined)&&
    (accountGroup===null||accountGroup===undefined)||
    Number(contentGroup)===Number(accountGroup)&&contentGroup!==null&&accountGroup!==null;
}
