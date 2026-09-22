"use strict";
import {json,badRequest,readJson,normalizeString} from "./http.js";
import {requireSession,requireMutation} from "./auth.js";

async function owned(env,id,userId){return env.DB.prepare(`SELECT id,title,description,project_id,status,content_type
  FROM content WHERE id=? AND user_id=?`).bind(id,userId).first()}
export async function libraryDetail(request,env,id){
  const auth=request.method==="GET"?{session:await requireSession(request,env)}:await requireMutation(request,env);
  if(auth.error)return auth.error;
  if(!auth.session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const userId=auth.session.user.id,content=await owned(env,id,userId);
  if(!content)return json({ok:false,error:"CONTENT_NOT_FOUND"},404,request);
  if(request.method==="GET"){
    const [tags,variants,publications]=await Promise.all([
      env.DB.prepare("SELECT tag FROM content_tags WHERE user_id=? AND content_id=? ORDER BY tag")
        .bind(userId,id).all(),
      env.DB.prepare(`SELECT id,platform,title,caption,music_reference,created_at FROM content_variants
        WHERE user_id=? AND content_id=? ORDER BY id DESC`).bind(userId,id).all(),
      env.DB.prepare(`SELECT id,platform,publish_state,scheduled_at,published_at,external_post_url
        FROM publication_jobs WHERE user_id=? AND content_id=? ORDER BY id DESC`).bind(userId,id).all()
    ]);
    return json({ok:true,content,tags:tags.results||[],variants:variants.results||[],
      publications:publications.results||[]},200,request);
  }
  const body=await readJson(request);if(!body)return badRequest(request,"INVALID_JSON");
  if(body.action==="addTag"){
    const tag=normalizeString(body.tag,40).toLowerCase();
    if(!/^[a-z0-9][a-z0-9 _-]{0,39}$/.test(tag))return badRequest(request,"INVALID_TAG");
    await env.DB.prepare("INSERT OR IGNORE INTO content_tags(user_id,content_id,tag) VALUES (?,?,?)")
      .bind(userId,id,tag).run();
    return json({ok:true},200,request);
  }
  if(body.action==="removeTag"){
    const tag=normalizeString(body.tag,40).toLowerCase();
    await env.DB.prepare("DELETE FROM content_tags WHERE user_id=? AND content_id=? AND tag=?")
      .bind(userId,id,tag).run();
    return json({ok:true},200,request);
  }
  if(body.action==="addVariant"){
    const platform=normalizeString(body.platform,30).toLowerCase();
    const title=normalizeString(body.title,200),caption=normalizeString(body.caption,5000);
    const music=normalizeString(body.musicReference,500);
    if(!["tiktok","youtube","instagram","other"].includes(platform)||!title)
      return badRequest(request,"INVALID_VARIANT");
    const result=await env.DB.prepare(`INSERT INTO content_variants
      (user_id,content_id,platform,title,caption,music_reference) VALUES (?,?,?,?,?,?)`)
      .bind(userId,id,platform,title,caption,music||null).run();
    return json({ok:true,id:Number(result.meta.last_row_id)},201,request);
  }
  return badRequest(request,"UNKNOWN_LIBRARY_ACTION");
}
