"use strict";
import {getOAuthCredential,getValidAccessToken} from "./oauth.js";
import {safeJson} from "./http.js";

export async function collectYouTubeMetrics(env){
  const rows=await env.DB.prepare(`SELECT id,social_account_id,external_post_id FROM publication_jobs
    WHERE platform='youtube' AND publish_state='published' AND external_post_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM publication_metrics m WHERE m.publication_job_id=publication_jobs.id
      AND m.collected_date=date('now'))
    ORDER BY updated_at DESC LIMIT 50`).all();
  const groups=new Map();
  for(const row of rows.results||[]){
    if(!/^[A-Za-z0-9_-]{5,100}$/.test(row.external_post_id))continue;
    if(!groups.has(row.social_account_id))groups.set(row.social_account_id,[]);
    groups.get(row.social_account_id).push(row);
  }
  let collected=0;
  for(const [accountId,jobs] of groups){
    try{
      const credential=await getOAuthCredential(env,accountId);
      if(!credential||credential.provider!=="youtube")continue;
      const token=await getValidAccessToken(env,credential);
      const ids=jobs.map(j=>j.external_post_id).join(",");
      const response=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(ids)}`,
        {headers:{Authorization:`Bearer ${token}`}});
      if(!response.ok)continue;
      const data=await safeJson(response);
      const byId=new Map((data?.items||[]).map(item=>[item.id,item.statistics||{}]));
      for(const job of jobs){
        const stats=byId.get(job.external_post_id);if(!stats)continue;
        const count=name=>stats[name]===undefined?null:Number(stats[name]);
        await env.DB.prepare(`INSERT INTO publication_metrics
          (publication_job_id,collected_date,views,likes,comments)
          VALUES (?,date('now'),?,?,?) ON CONFLICT(publication_job_id,collected_date)
          DO UPDATE SET views=excluded.views,likes=excluded.likes,comments=excluded.comments,
          created_at=CURRENT_TIMESTAMP`)
          .bind(job.id,count("viewCount"),count("likeCount"),count("commentCount")).run();
        collected++;
      }
    }catch(error){console.error("YouTube metrics failed",accountId,error)}
  }
  return collected;
}
