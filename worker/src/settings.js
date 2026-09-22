"use strict";
import {json,badRequest,readJson} from "./http.js";
import {requireSession,requireMutation} from "./auth.js";
import {verifyPassword,hashPassword} from "./security.js";
import {writeAudit} from "./audit.js";

export async function getAuditLog(request,env){
  const session=await requireSession(request,env);
  if(!session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const rows=await env.DB.prepare(`SELECT id,action,entity_type,entity_id,created_at FROM audit_log
    WHERE user_id=? ORDER BY id DESC LIMIT 100`).bind(session.user.id).all();
  return json({ok:true,events:rows.results||[]},200,request);
}
export async function changePassword(request,env){
  const auth=await requireMutation(request,env);if(auth.error)return auth.error;
  const body=await readJson(request);if(!body)return badRequest(request,"INVALID_JSON");
  if(typeof body.currentPassword!=="string"||typeof body.newPassword!=="string"||
    body.newPassword.length<12||body.newPassword.length>200)
    return badRequest(request,"PASSWORD_REQUIRES_12_TO_200_CHARACTERS");
  const user=await env.DB.prepare("SELECT password_hash FROM users WHERE id=?")
    .bind(auth.session.user.id).first();
  if(!user||!await verifyPassword(body.currentPassword,user.password_hash))
    return json({ok:false,error:"CURRENT_PASSWORD_INCORRECT"},403,request);
  const hash=await hashPassword(body.newPassword);
  await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(hash,auth.session.user.id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id!=?")
    .bind(auth.session.user.id,auth.session.sessionId).run();
  await writeAudit(env,auth.session.user.id,"PASSWORD_CHANGED","user",String(auth.session.user.id),request);
  return json({ok:true},200,request);
}
