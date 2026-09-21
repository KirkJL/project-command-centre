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


/* =========================================================
   GET OWNED MEDIA UPLOAD
========================================================= */

async function getOwnedUpload(
  env,
  userId,
  uploadId
) {
  return env.DB
    .prepare(`
      SELECT
        media_uploads.id,
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
        social_accounts.status
          AS account_status,

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


/* =========================================================
   NORMALISE TIKTOK STATUS
========================================================= */

function normaliseStatus(
  providerStatus
) {
  switch (
    String(
      providerStatus || ""
    ).toUpperCase()
  ) {
    case "PUBLISH_COMPLETE":
      return "published";

    case "FAILED":
      return "failed";

    case "PROCESSING_UPLOAD":
    case "PROCESSING_DOWNLOAD":
    case "SEND_TO_USER_INBOX":
      return "processing";

    default:
      return "processing";
  }
}


/* =========================================================
   FETCH TIKTOK STATUS
========================================================= */

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
        error:
          "UNAUTHENTICATED"
      },
      401,
      request
    );
  }


  if (
    !Number.isInteger(
      uploadId
    ) ||
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
        error:
          "UPLOAD_NOT_FOUND"
      },
      404,
      request
    );
  }


  if (
    upload.platform !==
    "tiktok"
  ) {
    return badRequest(
      request,
      "UPLOAD_IS_NOT_TIKTOK"
    );
  }


  /*
   * Terminal states don't need another
   * provider request.
   */
  if (
    upload.upload_state ===
      "published" ||
    upload.upload_state ===
      "failed"
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


  if (
    !upload.platform_upload_id
  ) {
    return json(
      {
        ok: false,
        error:
          "PUBLISH_ID_MISSING"
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
        error:
          "ACCOUNT_NOT_CONNECTED"
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
      "TikTok status token:",
      error
    );


    return json(
      {
        ok: false,
        error:
          "TIKTOK_REAUTH_REQUIRED"
      },
      409,
      request
    );
  }


  const response =
    await fetch(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json; charset=UTF-8"
        },

        body:
          JSON.stringify({
            publish_id:
              upload.platform_upload_id
          })
      }
    );


  const data =
    await safeJson(
      response
    );


  if (
    !response.ok ||
    (
      data?.error?.code &&
      data.error.code !== "ok"
    )
  ) {
    console.error(
      "TikTok publish status failed:",
      data
    );


    return json(
      {
        ok: false,

        error:
          "TIKTOK_STATUS_FAILED",

        providerError:
          data?.error?.code ||
          null
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
    normaliseStatus(
      providerStatus
    );


  const failReason =
    localState === "failed"
      ? String(
          providerData.fail_reason ||
          "TikTok reported that publishing failed."
        ).slice(
          0,
          1000
        )
      : null;


  /*
   * TikTok may provide one or more public
   * post IDs after successful publishing.
   */
  const publicPostIds =
    Array.isArray(
      providerData.publicaly_available_post_id
    )
      ? providerData
          .publicaly_available_post_id
      : [];


  const platformPostId =
    publicPostIds.length
      ? String(
          publicPostIds[0]
        )
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


  /*
   * If TikTok confirms the post exists,
   * update the master content status too.
   *
   * We do NOT do this merely because the
   * browser finished transferring the file.
   */
  if (
    localState ===
    "published"
  ) {
    await env.DB
      .prepare(`
        UPDATE content

        SET
          status = 'published',
          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
        AND user_id = ?
      `)
      .bind(
        upload.content_id,
        session.user.id
      )
      .run();
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
