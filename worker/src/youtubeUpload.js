"use strict";

import {json,badRequest,readJson,normalizeString,safeJson} from "./http.js";
import {requireMutation,requireSession} from "./auth.js";
import {getOAuthCredential,getValidAccessToken} from "./oauth.js";
import {encryptSecret,decryptSecret} from "./security.js";
import {brandsMatch} from "./brands.js";

const CHUNK_SIZE=8*1024*1024;
const TYPES=new Set(["video/mp4","video/webm","video/quicktime"]);
const PRIVACY=new Set(["private","unlisted","public"]);

function validSessionUrl(value){
  try {const u=new URL(value);return u.protocol==="https:"&&u.hostname==="www.googleapis.com"&&
    u.pathname==="/upload/youtube/v3/videos"&&u.searchParams.get("uploadType")==="resumable";}
  catch{return false;}
}
async function owned(env,id,userId){
  return env.DB.prepare("SELECT * FROM youtube_uploads WHERE id=? AND user_id=? LIMIT 1").bind(id,userId).first();
}
async function tokenFor(env,accountId){
  const credential=await getOAuthCredential(env,accountId);
  if(!credential||credential.provider!=="youtube")throw Error("YOUTUBE_REAUTH_REQUIRED");
  return getValidAccessToken(env,credential);
}
async function googleSession(env,row){
  const sessionUrl=await decryptSecret(env,row.session_url_encrypted);
  if(!validSessionUrl(sessionUrl))throw Error("INVALID_UPLOAD_SESSION");
  return sessionUrl;
}
function publicUpload(row){
  return {id:row.id,publicationId:row.publication_job_id,fileSize:row.file_size,
    bytesUploaded:row.bytes_uploaded,state:row.upload_state,videoId:row.video_id,
    privacyStatus:row.privacy_status,lastError:row.last_error};
}
export async function initYouTubeUpload(request,env){
  const auth=await requireMutation(request,env);if(auth.error)return auth.error;
  const body=await readJson(request);if(!body)return badRequest(request,"INVALID_JSON");
  const contentId=Number(body.contentId),accountId=Number(body.accountId),fileSize=Number(body.fileSize);
  const mimeType=normalizeString(body.mimeType,100).toLowerCase();
  const title=normalizeString(body.title,100),description=normalizeString(body.description,5000);
  const privacyStatus=normalizeString(body.privacyStatus,20).toLowerCase()||"private";
  if(!Number.isSafeInteger(contentId)||contentId<1||!Number.isSafeInteger(accountId)||accountId<1||
    !Number.isSafeInteger(fileSize)||fileSize<1||!TYPES.has(mimeType)||!title||!PRIVACY.has(privacyStatus))
    return badRequest(request,"INVALID_YOUTUBE_UPLOAD");
  const userId=auth.session.user.id;
  const context=await env.DB.prepare(`SELECT c.project_id,c.brand_group_id AS content_brand_group_id,
    a.brand_group_id AS account_brand_group_id,a.platform,a.status AS account_status
    FROM content c JOIN social_accounts a ON a.project_id=c.project_id
    WHERE c.id=? AND c.user_id=? AND a.id=? AND a.user_id=? LIMIT 1`)
    .bind(contentId,userId,accountId,userId).first();
  if(!context||context.platform!=="youtube")return badRequest(request,"YOUTUBE_ACCOUNT_PROJECT_MISMATCH");
  if(!brandsMatch(context.content_brand_group_id,context.account_brand_group_id))
    return badRequest(request,"BRAND_GROUP_MISMATCH");
  let token;
  try{token=await tokenFor(env,accountId)}catch{return json({ok:false,error:"YOUTUBE_REAUTH_REQUIRED"},409,request)}
  let job=await env.DB.prepare(`SELECT id FROM publication_jobs WHERE user_id=? AND content_id=?
    AND social_account_id=? AND publish_state IN ('draft','ready','failed') ORDER BY id DESC LIMIT 1`)
    .bind(userId,contentId,accountId).first();
  if(!job){
    const created=await env.DB.prepare(`INSERT INTO publication_jobs
      (user_id,project_id,content_id,social_account_id,platform,title,description,publish_state,
       attempt_count,max_attempts,created_at,updated_at)
      VALUES (?,?,?,?, 'youtube',?,?,'ready',0,3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
      .bind(userId,context.project_id,contentId,accountId,title,description).run();
    job={id:Number(created.meta.last_row_id)};
  }
  const active=await env.DB.prepare(`SELECT id FROM youtube_uploads WHERE publication_job_id=?
    AND upload_state IN ('ready','sending','uploading','processing') LIMIT 1`).bind(job.id).first();
  if(active)return json({ok:false,error:"ACTIVE_UPLOAD_ALREADY_EXISTS",uploadId:active.id},409,request);
  const response=await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",{
    method:"POST",redirect:"manual",headers:{Authorization:`Bearer ${token}`,
      "Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Length":String(fileSize),
      "X-Upload-Content-Type":mimeType},
    body:JSON.stringify({snippet:{title,description,categoryId:"22"},status:{privacyStatus}})
  });
  const sessionUrl=response.headers.get("Location");
  if(!response.ok||!validSessionUrl(sessionUrl)){
    const error=await safeJson(response);
    return json({ok:false,error:"YOUTUBE_INIT_FAILED",providerError:error?.error?.message||null},502,request);
  }
  const encrypted=await encryptSecret(env,sessionUrl);
  const insert=await env.DB.prepare(`INSERT INTO youtube_uploads
    (user_id,publication_job_id,social_account_id,file_size,mime_type,session_url_encrypted,privacy_status)
    VALUES (?,?,?,?,?,?,?)`).bind(userId,job.id,accountId,fileSize,mimeType,encrypted,privacyStatus).run();
  await env.DB.prepare(`UPDATE publication_jobs SET title=?,description=?,publish_state='processing',
    processing_started_at=CURRENT_TIMESTAMP,last_error=NULL,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND user_id=?`).bind(title,description,job.id,userId).run();
  return json({ok:true,uploadId:Number(insert.meta.last_row_id),publicationId:job.id,chunkSize:CHUNK_SIZE},201,request);
}

async function finishUpload(env,row,video){
  const videoId=String(video?.id||"");
  if(!/^[A-Za-z0-9_-]{5,100}$/.test(videoId))throw Error("YOUTUBE_VIDEO_ID_MISSING");
  await env.DB.prepare(`UPDATE youtube_uploads SET upload_state='processing',video_id=?,bytes_uploaded=file_size,
    last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(videoId,row.id).run();
  await env.DB.prepare(`UPDATE publication_jobs SET external_post_id=?,external_post_url=?,
    publish_state='processing',processing_started_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND user_id=?`).bind(videoId,`https://www.youtube.com/watch?v=${videoId}`,
      row.publication_job_id,row.user_id).run();
}
function nextOffset(response){
  const range=response.headers.get("Range");const match=range?.match(/^bytes=0-(\d+)$/);
  return match?Number(match[1])+1:0;
}
export async function sendYouTubeChunk(request,env,id){
  const auth=await requireMutation(request,env);if(auth.error)return auth.error;
  const row=await owned(env,id,auth.session.user.id);
  if(!row)return json({ok:false,error:"UPLOAD_NOT_FOUND"},404,request);
  if(!["ready","uploading"].includes(row.upload_state))return json({ok:false,error:"UPLOAD_NOT_READY"},409,request);
  const offset=Number(new URL(request.url).searchParams.get("offset"));
  const length=Number(request.headers.get("Content-Length"));
  if(!Number.isSafeInteger(offset)||offset!==row.bytes_uploaded||!Number.isSafeInteger(length)||
    length<1||length>CHUNK_SIZE||offset+length>row.file_size||
    (offset+length<row.file_size&&length%262144!==0))return badRequest(request,"INVALID_CHUNK_RANGE");
  const claim=await env.DB.prepare(`UPDATE youtube_uploads SET upload_state='sending',updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND user_id=? AND bytes_uploaded=? AND upload_state IN ('ready','uploading')`)
    .bind(id,row.user_id,offset).run();
  if(Number(claim.meta?.changes||0)!==1)return json({ok:false,error:"UPLOAD_BUSY"},409,request);
  try{
    const sessionUrl=await googleSession(env,row),token=await tokenFor(env,row.social_account_id);
    const response=await fetch(sessionUrl,{method:"PUT",redirect:"manual",headers:{
      Authorization:`Bearer ${token}`,"Content-Type":row.mime_type,
      "Content-Range":`bytes ${offset}-${offset+length-1}/${row.file_size}`},body:request.body});
    if(response.status===308){
      const bytes=nextOffset(response);
      await env.DB.prepare(`UPDATE youtube_uploads SET upload_state='uploading',bytes_uploaded=?,updated_at=CURRENT_TIMESTAMP
        WHERE id=?`).bind(bytes,id).run();
      return json({ok:true,state:"uploading",bytesUploaded:bytes,fileSize:row.file_size},200,request);
    }
    if(response.ok){
      const data=await safeJson(response);await finishUpload(env,row,data);
      return json({ok:true,state:"processing",bytesUploaded:row.file_size,videoId:data.id},200,request);
    }
    const data=await safeJson(response);
    const retryable=response.status>=500||response.status===429;
    await env.DB.prepare(`UPDATE youtube_uploads SET upload_state=?,last_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(retryable?"uploading":"failed",String(data?.error?.message||`HTTP_${response.status}`).slice(0,500),id).run();
    if(!retryable)await env.DB.prepare(`UPDATE publication_jobs SET publish_state='failed',
      last_error=?,processing_started_at=NULL,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND user_id=? AND publish_state='processing'`)
      .bind(String(data?.error?.message||`HTTP_${response.status}`).slice(0,500),row.publication_job_id,row.user_id).run();
    return json({ok:false,error:retryable?"YOUTUBE_UPLOAD_RETRY":"YOUTUBE_UPLOAD_FAILED",
      providerError:data?.error?.message||null},retryable?503:502,request);
  }catch(error){
    await env.DB.prepare("UPDATE youtube_uploads SET upload_state='uploading',last_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(String(error.message||error).slice(0,500),id).run();
    return json({ok:false,error:"YOUTUBE_UPLOAD_UNCERTAIN"},503,request);
  }
}
export async function youtubeUploadStatus(request,env,id){
  const session=await requireSession(request,env);
  if(!session)return json({ok:false,error:"UNAUTHENTICATED"},401,request);
  const row=await owned(env,id,session.user.id);
  if(!row)return json({ok:false,error:"UPLOAD_NOT_FOUND"},404,request);
  if(["ready","sending","uploading"].includes(row.upload_state)){
    try{
      const sessionUrl=await googleSession(env,row),token=await tokenFor(env,row.social_account_id);
      const response=await fetch(sessionUrl,{method:"PUT",redirect:"manual",headers:{
        Authorization:`Bearer ${token}`,"Content-Range":`bytes */${row.file_size}`}});
      if(response.status===308){
        const bytes=nextOffset(response);
        await env.DB.prepare(`UPDATE youtube_uploads SET upload_state='uploading',bytes_uploaded=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
          .bind(bytes,id).run();
        row.bytes_uploaded=bytes;row.upload_state="uploading";
      }else if(response.ok){const data=await safeJson(response);await finishUpload(env,row,data);
        row.bytes_uploaded=row.file_size;row.upload_state="processing";row.video_id=data.id;}
      else if(response.status===404){
        await env.DB.prepare(`UPDATE youtube_uploads SET upload_state='failed',last_error='UPLOAD_SESSION_EXPIRED',
          updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run();
        await env.DB.prepare(`UPDATE publication_jobs SET publish_state='failed',last_error='UPLOAD_SESSION_EXPIRED',
          processing_started_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND publish_state='processing'`)
          .bind(row.publication_job_id,row.user_id).run();
        row.upload_state="failed";row.last_error="UPLOAD_SESSION_EXPIRED";
      }
    }catch(error){console.error("YouTube upload status failed",id,error)}
  }
  if(row.upload_state==="processing"){
    await reconcileYouTubeUploads(env,id);
    return json({ok:true,upload:publicUpload(await owned(env,id,session.user.id))},200,request);
  }
  return json({ok:true,upload:publicUpload(row)},200,request);
}

export async function reconcileYouTubeUploads(env,uploadId=null){
  const result=uploadId===null
    ? await env.DB.prepare(`SELECT * FROM youtube_uploads WHERE upload_state='processing'
      ORDER BY updated_at ASC LIMIT 10`).all()
    : await env.DB.prepare(`SELECT * FROM youtube_uploads WHERE id=? AND upload_state='processing' LIMIT 1`)
      .bind(uploadId).all();
  let checked=0;
  for(const row of result.results||[]){
    try{
      const token=await tokenFor(env,row.social_account_id);
      const url=`https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=${encodeURIComponent(row.video_id)}`;
      const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
      if(!response.ok)continue;
      const data=await safeJson(response),video=data?.items?.[0];if(!video)continue;
      checked++;
      const state=video.status?.uploadStatus;
      const processing=video.processingDetails?.processingStatus;
      const failed=["failed","rejected","deleted"].includes(state)||processing==="failed";
      const done=processing==="succeeded"||state==="processed";
      if(!failed&&!done)continue;
      const error=failed?String(video.status?.failureReason||video.status?.rejectionReason||"YOUTUBE_PROCESSING_FAILED").slice(0,500):null;
      await env.DB.prepare(`UPDATE youtube_uploads SET upload_state=?,privacy_status=?,last_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(failed?"failed":"published",video.status?.privacyStatus||row.privacy_status,error,row.id).run();
      await env.DB.prepare(`UPDATE publication_jobs SET publish_state=?,last_error=?,processing_started_at=NULL,
        published_at=CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE published_at END,
        updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND publish_state='processing'`)
        .bind(failed?"failed":"published",error,failed?"failed":"published",row.publication_job_id,row.user_id).run();
      if(done){
        const job=await env.DB.prepare("SELECT content_id FROM publication_jobs WHERE id=? AND user_id=?")
          .bind(row.publication_job_id,row.user_id).first();
        if(job){
          const outstanding=await env.DB.prepare(`SELECT COUNT(*) AS n FROM publication_jobs WHERE user_id=? AND content_id=?
            AND publish_state NOT IN ('published','cancelled')`).bind(row.user_id,job.content_id).first();
          if(Number(outstanding?.n||0)===0)await env.DB.prepare(`UPDATE content SET status='published',updated_at=CURRENT_TIMESTAMP
            WHERE id=? AND user_id=?`).bind(job.content_id,row.user_id).run();
        }
      }
    }catch(error){console.error("YouTube reconciliation failed",row.id,error)}
  }
  return checked;
}
