"use strict";

import {
  json,
  badRequest,
  safeJson
} from "./http.js";

import {
  requireSession
} from "./auth.js";

import {
  getOAuthCredential,
  getValidAccessToken
} from "./oauth.js";


async function getOwnedUpload(
  env,
  userId,
  uploadId
) {
  return env.DB
    .prepare(`
      SELECT
        media_uploads.id,
        media_uploads.publication_job_id,
        media_uploads.user_id,
        media_uploads.project_id,
        media_uploads.content_id,
        media_uploads.social_account_id,
        media_uploads.platform,
        media_uploads.file_name,
        media_uploads.mime_type,
        media_uploads.file_size,
        media_uploads.upload_state,
        media_uploads.platform_upload_id,
        media_uploads.platform_post_id,
        media_uploads.last_error,
        media_uploads.created_at,
        media_uploads.updated_at,

        social_accounts.account_name,
        social_accounts.account_handle,

        content.title
          AS content_title

      FROM media_uploads

      INNER JOIN social_accounts
        ON social_accounts.id =
           media_uploads.social_account_id

      INNER JOIN content
        ON content.id =
           media_uploads.content_id

      WHERE media_uploads.id = ?
        AND media_uploads.user_id = ?

      LIMIT 1
    `)
    .bind(
      uploadId,
      userId
    )
    .first();
}


function normaliseTikTokStatus(
  status
) {
  switch (
    String(status || "")
      .toUpperCase()
  ) {
    case "PUBLISH_COMPLETE":
      return "published";

    case "FAILED":
      return "failed";

    default:
      return "processing";
  }
}


export async function getTikTokPublishStatus(
  request,
  env,
  uploadId
) {
  const session =
    await requireSession(
      request,
      env
    );

  if (!session) {
    return json(
      {
        ok: false,
        error: "UNAUTHENTICATED"
      },
      401,
      request
    );
  }

  if (
    !Number.isInteger(uploadId) ||
    uploadId <= 0
  ) {
    return badRequest(
      request,
      "INVALID_UPLOAD"
    );
  }

  const upload =
    await getOwnedUpload(
      env,
      session.user.id,
      uploadId
    );

  if (!upload) {
    return json(
      {
        ok: false,
        error: "UPLOAD_NOT_FOUND"
      },
      404,
      request
    );
  }

  if (upload.platform !== "tiktok") {
    return badRequest(
      request,
      "UPLOAD_IS_NOT_TIKTOK"
    );
  }

  /*
   * Terminal local states do not need
   * another TikTok request.
   */
  if (
    upload.upload_state === "published" ||
    upload.upload_state === "failed"
  ) {
    return json(
      {
        ok: true,

        upload: {
          ...upload,

          providerStatus:
            upload.upload_state ===
              "published"
              ? "PUBLISH_COMPLETE"
              : "FAILED"
        }
      },
      200,
      request
    );
  }

  if (!upload.platform_upload_id) {
    return json(
      {
        ok: false,
        error: "PUBLISH_ID_MISSING"
      },
      409,
      request
    );
  }

  const credential =
    await getOAuthCredential(
      env,
      upload.social_account_id
    );

  if (!credential) {
    return json(
      {
        ok: false,
        error: "ACCOUNT_NOT_CONNECTED"
      },
      409,
      request
    );
  }

  let accessToken;

  try {
    accessToken =
      await getValidAccessToken(
        env,
        credential
      );
  } catch (error) {
    console.error(
      "TikTok status token error:",
      error
    );

    return json(
      {
        ok: false,
        error: "TIKTOK_REAUTH_REQUIRED"
      },
      409,
      request
    );
  }

  const response = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json; charset=UTF-8"
      },

      body: JSON.stringify({
        publish_id:
          upload.platform_upload_id
      })
    }
  );

  const data =
    await safeJson(response);

  if (
    !response.ok ||
    (
      data?.error?.code &&
      data.error.code !== "ok"
    )
  ) {
    console.error(
      "TikTok status fetch failed:",
      data
    );

    return json(
      {
        ok: false,

        error:
          "TIKTOK_STATUS_FAILED",

        providerError:
          data?.error?.code || null
      },
      502,
      request
    );
  }

  const providerData =
    data?.data || {};

  const providerStatus =
    String(
      providerData.status || ""
    ).toUpperCase();

  const localState =
    normaliseTikTokStatus(
      providerStatus
    );

  const failReason =
    localState === "failed"
      ? String(
          providerData.fail_reason ||
          "TikTok reported that publishing failed."
        ).slice(0, 1000)
      : null;

  /*
   * TikTok currently spells this response
   * property "publicaly_available_post_id".
   */
  const publicPostIds =
    Array.isArray(
      providerData
        .publicaly_available_post_id
    )
      ? providerData
          .publicaly_available_post_id
      : [];

  const platformPostId =
    publicPostIds.length > 0
      ? String(publicPostIds[0])
      : null;

  await env.DB
    .prepare(`
      UPDATE media_uploads

      SET
        upload_state = ?,

        platform_post_id =
          COALESCE(
            ?,
            platform_post_id
          ),

        last_error = ?,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND user_id = ?
    `)
    .bind(
      localState,
      platformPostId,
      failReason,
      uploadId,
      session.user.id
    )
    .run();

  if (upload.publication_job_id && localState !== "processing") {
    const externalId = platformPostId || upload.platform_upload_id;
    const handle = String(upload.account_handle || "").replace(/^@/, "");
    const postUrl = platformPostId && /^[A-Za-z0-9._]+$/.test(handle)
      ? `https://www.tiktok.com/@${handle}/video/${encodeURIComponent(platformPostId)}`
      : null;
    await env.DB.prepare(`
      UPDATE publication_jobs SET publish_state=?,
        external_post_id=COALESCE(?,external_post_id),
        external_post_url=COALESCE(?,external_post_url),
        last_error=?, processing_started_at=NULL,
        published_at=CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE published_at END,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND user_id=? AND publish_state='processing'
    `).bind(localState, externalId, postUrl, failReason, localState,
      upload.publication_job_id, session.user.id).run();
    if (localState === "published") {
      const outstanding = await env.DB.prepare(`
        SELECT COUNT(*) AS n FROM publication_jobs
        WHERE user_id=? AND content_id=?
        AND publish_state NOT IN ('published','cancelled')
      `).bind(session.user.id,upload.content_id).first();
      if (Number(outstanding?.n || 0) === 0) await env.DB.prepare(`
        UPDATE content SET status='published',updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND user_id=?
      `).bind(upload.content_id,session.user.id).run();
    }
  }

  const refreshed =
    await getOwnedUpload(
      env,
      session.user.id,
      uploadId
    );

  return json(
    {
      ok: true,

      upload: {
        ...refreshed,

        providerStatus,

        failReason,

        uploadedBytes:
          Number(
            providerData
              .uploaded_bytes || 0
          )
      }
    },
    200,
    request
  );
}


// Cron reconciliation continues after the browser closes.
export async function reconcileTikTokUploads(env) {
  const rows = await env.DB.prepare(`
    SELECT id,user_id,content_id,publication_job_id,social_account_id,
      platform_upload_id FROM media_uploads
    WHERE platform='tiktok' AND upload_state='processing'
      AND platform_upload_id IS NOT NULL ORDER BY updated_at ASC LIMIT 10
  `).all();
  let checked=0;
  for (const upload of rows.results||[]) {
    try {
      const credential=await getOAuthCredential(env,upload.social_account_id);
      if(!credential)continue;
      const token=await getValidAccessToken(env,credential);
      const response=await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/",{
        method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json; charset=UTF-8"},
        body:JSON.stringify({publish_id:upload.platform_upload_id})
      });
      const data=await safeJson(response);
      if(!response.ok||data?.error?.code!=="ok")continue;
      checked++;
      const state=normaliseTikTokStatus(data?.data?.status);
      if(state==="processing")continue;
      const ids=data?.data?.publicaly_available_post_id;
      const postId=Array.isArray(ids)&&ids.length?String(ids[0]):null;
      const fail=state==="failed"?String(data?.data?.fail_reason||"TIKTOK_PUBLISH_FAILED").slice(0,1000):null;
      await env.DB.prepare(`UPDATE media_uploads SET upload_state=?,platform_post_id=COALESCE(?,platform_post_id),
        last_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND upload_state='processing'`)
        .bind(state,postId,fail,upload.id).run();
      if(upload.publication_job_id){
        const account=await env.DB.prepare("SELECT account_handle FROM social_accounts WHERE id=? AND user_id=?")
          .bind(upload.social_account_id,upload.user_id).first();
        const handle=String(account?.account_handle||"").replace(/^@/,"");
        const url=postId&&/^[A-Za-z0-9._]+$/.test(handle)
          ?`https://www.tiktok.com/@${handle}/video/${encodeURIComponent(postId)}`:null;
        await env.DB.prepare(`UPDATE publication_jobs SET publish_state=?,external_post_id=COALESCE(?,external_post_id),
          external_post_url=COALESCE(?,external_post_url),last_error=?,processing_started_at=NULL,
          published_at=CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE published_at END,
          updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND publish_state='processing'`)
          .bind(state,postId||upload.platform_upload_id,url,fail,state,upload.publication_job_id,upload.user_id).run();
      }
      if(state==="published"){
        const outstanding=await env.DB.prepare(`SELECT COUNT(*) AS n FROM publication_jobs WHERE user_id=? AND content_id=?
          AND publish_state NOT IN ('published','cancelled')`).bind(upload.user_id,upload.content_id).first();
        if(Number(outstanding?.n||0)===0)await env.DB.prepare(`UPDATE content SET status='published',updated_at=CURRENT_TIMESTAMP
          WHERE id=? AND user_id=?`).bind(upload.content_id,upload.user_id).run();
      }
    }catch(error){console.error("TikTok reconciliation failed",upload.id,error)}
  }
  return checked;
}
