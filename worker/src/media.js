"use strict";

import {
  json,
  badRequest,
  readJson,
  normalizeString,
  safeJson
} from "./http.js";

import {
  requireSession,
  requireMutation
} from "./auth.js";

import {
  getOAuthCredential,
  getValidAccessToken
} from "./oauth.js";


const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm"
]);

const DEFAULT_CHUNK_SIZE = 10_000_000;
const MAX_STANDARD_CHUNK_SIZE = 64_000_000;


/* =========================================================
   HELPERS
========================================================= */

async function getOwnedPublishingContext(
  env,
  userId,
  contentId,
  accountId
) {
  return env.DB
    .prepare(`
      SELECT
        content.id AS content_id,
        content.project_id,
        content.title AS content_title,

        social_accounts.id AS account_id,
        social_accounts.platform,
        social_accounts.status AS account_status,
        social_accounts.account_name,
        social_accounts.account_handle

      FROM content

      INNER JOIN social_accounts
        ON social_accounts.project_id = content.project_id

      WHERE content.id = ?
        AND content.user_id = ?
        AND social_accounts.id = ?
        AND social_accounts.user_id = ?

      LIMIT 1
    `)
    .bind(
      contentId,
      userId,
      accountId,
      userId
    )
    .first();
}


function validateVideo(
  fileName,
  mimeType,
  fileSize
) {
  if (!fileName) {
    return "FILE_NAME_REQUIRED";
  }

  if (!ALLOWED_VIDEO_TYPES.has(mimeType)) {
    return "UNSUPPORTED_VIDEO_TYPE";
  }

  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize <= 0
  ) {
    return "INVALID_FILE_SIZE";
  }

  return null;
}


/*
 * TikTok:
 *
 * total_chunk_count =
 * floor(video_size / chunk_size)
 *
 * The final chunk contains trailing bytes.
 *
 * Files <= 64 MB can be uploaded as one chunk.
 */
function getTikTokChunkConfig(fileSize) {
  if (fileSize <= MAX_STANDARD_CHUNK_SIZE) {
    return {
      chunkSize: fileSize,
      totalChunkCount: 1
    };
  }

  const chunkSize = DEFAULT_CHUNK_SIZE;

  const totalChunkCount = Math.max(
    1,
    Math.floor(fileSize / chunkSize)
  );

  return {
    chunkSize,
    totalChunkCount
  };
}


/* =========================================================
   INITIALISE TIKTOK DIRECT POST
========================================================= */

export async function initialiseTikTokUpload(
  request,
  env
) {
  const auth = await requireMutation(
    request,
    env
  );

  if (auth.error) {
    return auth.error;
  }

  const body = await readJson(request);

  if (!body) {
    return badRequest(
      request,
      "INVALID_JSON"
    );
  }

  const contentId = Number(
    body.contentId
  );

  const accountId = Number(
    body.accountId
  );

  const fileName = normalizeString(
    body.fileName,
    255
  );

  const mimeType = normalizeString(
    body.mimeType,
    100
  ).toLowerCase();

  const fileSize = Number(
    body.fileSize
  );

  const caption = normalizeString(
    body.caption,
    2200
  );

  const privacyLevel = normalizeString(
    body.privacyLevel,
    100
  ) || "SELF_ONLY";

  const disableComment = Boolean(
    body.disableComment
  );

  const disableDuet = Boolean(
    body.disableDuet
  );

  const disableStitch = Boolean(
    body.disableStitch
  );

  const isAigc = Boolean(
    body.isAigc
  );

  if (
    !Number.isInteger(contentId) ||
    contentId <= 0
  ) {
    return badRequest(
      request,
      "INVALID_CONTENT"
    );
  }

  if (
    !Number.isInteger(accountId) ||
    accountId <= 0
  ) {
    return badRequest(
      request,
      "INVALID_ACCOUNT"
    );
  }

  const validationError = validateVideo(
    fileName,
    mimeType,
    fileSize
  );

  if (validationError) {
    return badRequest(
      request,
      validationError
    );
  }

  const context =
    await getOwnedPublishingContext(
      env,
      auth.session.user.id,
      contentId,
      accountId
    );

  if (!context) {
    return json(
      {
        ok: false,
        error: "PUBLISHING_CONTEXT_NOT_FOUND"
      },
      404,
      request
    );
  }

  if (context.platform !== "tiktok") {
    return badRequest(
      request,
      "ACCOUNT_IS_NOT_TIKTOK"
    );
  }

  const credential =
    await getOAuthCredential(
      env,
      accountId
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
      "TikTok access token error:",
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


  /* ---------------------------------------------------------
     Query current creator settings
  --------------------------------------------------------- */

  const creatorResponse = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json; charset=UTF-8"
      },

      body: JSON.stringify({})
    }
  );

  const creatorData =
    await safeJson(
      creatorResponse
    );

  if (
    !creatorResponse.ok ||
    creatorData?.error?.code !== "ok"
  ) {
    console.error(
      "TikTok creator info failed:",
      creatorData
    );

    return json(
      {
        ok: false,
        error: "TIKTOK_CREATOR_INFO_FAILED",
        providerError:
          creatorData?.error?.code || null
      },
      502,
      request
    );
  }

  const creatorInfo =
    creatorData?.data || {};

  const privacyOptions =
    Array.isArray(
      creatorInfo.privacy_level_options
    )
      ? creatorInfo.privacy_level_options
      : [];

  if (
    privacyOptions.length > 0 &&
    !privacyOptions.includes(
      privacyLevel
    )
  ) {
    return json(
      {
        ok: false,
        error:
          "INVALID_TIKTOK_PRIVACY_LEVEL",
        privacyOptions
      },
      400,
      request
    );
  }

  const maxDuration = Number(
    creatorInfo
      .max_video_post_duration_sec ||
    0
  );

  const {
    chunkSize,
    totalChunkCount
  } = getTikTokChunkConfig(
    fileSize
  );


  /* ---------------------------------------------------------
     Create local media record
  --------------------------------------------------------- */

  const insert = await env.DB
    .prepare(`
      INSERT INTO media_uploads (
        user_id,
        project_id,
        content_id,
        social_account_id,
        platform,
        file_name,
        mime_type,
        file_size,
        upload_state
      )
      VALUES (
        ?, ?, ?, ?,
        'tiktok',
        ?, ?, ?,
        'initialising'
      )
    `)
    .bind(
      auth.session.user.id,
      context.project_id,
      contentId,
      accountId,
      fileName,
      mimeType,
      fileSize
    )
    .run();

  const mediaUploadId = Number(
    insert.meta.last_row_id
  );


  /* ---------------------------------------------------------
     Initialise TikTok Direct Post
  --------------------------------------------------------- */

  const postInfo = {
    title: caption,

    privacy_level:
      privacyLevel,

    disable_duet:
      disableDuet,

    disable_comment:
      disableComment,

    disable_stitch:
      disableStitch
  };

  if (isAigc) {
    postInfo.is_aigc = true;
  }

  const payload = {
    post_info: postInfo,

    source_info: {
      source: "FILE_UPLOAD",

      video_size:
        fileSize,

      chunk_size:
        chunkSize,

      total_chunk_count:
        totalChunkCount
    }
  };

  const response = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json; charset=UTF-8"
      },

      body: JSON.stringify(
        payload
      )
    }
  );

  const data =
    await safeJson(response);

  if (
    !response.ok ||
    data?.error?.code !== "ok" ||
    !data?.data?.upload_url ||
    !data?.data?.publish_id
  ) {
    console.error(
      "TikTok Direct Post init failed:",
      data
    );

    const providerError =
      normalizeString(
        data?.error?.code ||
        data?.error?.message ||
        "TIKTOK_UPLOAD_INIT_FAILED",
        500
      );

    await env.DB
      .prepare(`
        UPDATE media_uploads

        SET
          upload_state = 'failed',
          last_error = ?,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = ?
          AND user_id = ?
      `)
      .bind(
        providerError,
        mediaUploadId,
        auth.session.user.id
      )
      .run();

    return json(
      {
        ok: false,
        error:
          "TIKTOK_UPLOAD_INIT_FAILED",
        providerError
      },
      502,
      request
    );
  }

  await env.DB
    .prepare(`
      UPDATE media_uploads

      SET
        upload_state =
          'ready_for_upload',

        platform_upload_id = ?,

        last_error = NULL,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND user_id = ?
    `)
    .bind(
      data.data.publish_id,
      mediaUploadId,
      auth.session.user.id
    )
    .run();

  return json(
    {
      ok: true,

      mediaUploadId,

      platform: "tiktok",

      publishId:
        data.data.publish_id,

      uploadUrl:
        data.data.upload_url,

      chunkSize,

      totalChunkCount,

      creatorInfo: {
        privacyLevelOptions:
          privacyOptions,

        commentDisabled:
          Boolean(
            creatorInfo.comment_disabled
          ),

        duetDisabled:
          Boolean(
            creatorInfo.duet_disabled
          ),

        stitchDisabled:
          Boolean(
            creatorInfo.stitch_disabled
          ),

        maxVideoPostDurationSec:
          maxDuration
      }
    },
    200,
    request
  );
}


/* =========================================================
   BROWSER TRANSFER COMPLETE
========================================================= */

export async function completeTikTokUpload(
  request,
  env,
  uploadId
) {
  const auth = await requireMutation(
    request,
    env
  );

  if (auth.error) {
    return auth.error;
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

  const upload = await env.DB
    .prepare(`
      SELECT
        id,
        platform,
        platform_upload_id,
        upload_state

      FROM media_uploads

      WHERE id = ?
        AND user_id = ?

      LIMIT 1
    `)
    .bind(
      uploadId,
      auth.session.user.id
    )
    .first();

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

  await env.DB
    .prepare(`
      UPDATE media_uploads

      SET
        upload_state = 'processing',
        last_error = NULL,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = ?
        AND user_id = ?
    `)
    .bind(
      uploadId,
      auth.session.user.id
    )
    .run();

  return json(
    {
      ok: true,

      mediaUploadId:
        uploadId,

      publishId:
        upload.platform_upload_id,

      state: "processing"
    },
    200,
    request
  );
}


/* =========================================================
   MEDIA LIST
========================================================= */

export async function getMediaUploads(
  request,
  env
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

  const rows = await env.DB
    .prepare(`
      SELECT
        media_uploads.id,
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

        content.title
          AS content_title,

        projects.name
          AS project_name,

        social_accounts.account_name,
        social_accounts.account_handle

      FROM media_uploads

      INNER JOIN content
        ON content.id =
           media_uploads.content_id

      INNER JOIN projects
        ON projects.id =
           media_uploads.project_id

      INNER JOIN social_accounts
        ON social_accounts.id =
           media_uploads.social_account_id

      WHERE media_uploads.user_id = ?

      ORDER BY
        media_uploads.created_at DESC

      LIMIT 100
    `)
    .bind(
      session.user.id
    )
    .all();

  return json(
    {
      ok: true,
      uploads:
        rows.results || []
    },
    200,
    request
  );
}
