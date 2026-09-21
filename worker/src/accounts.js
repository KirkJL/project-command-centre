"use strict";

import {
  SOCIAL_PLATFORMS
} from "./config.js";

import {
  json,
  badRequest,
  readJson,
  normalizeString
} from "./http.js";

import {
  requireSession,
  requireMutation
} from "./auth.js";

import {
  assertOwnedProject
} from "./projects.js";

import {
  writeAudit
} from "./audit.js";


export async function getAccounts(
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

  const result =
    await env.DB
      .prepare(`
        SELECT
          social_accounts.id,
          social_accounts.project_id,
          social_accounts.platform,
          social_accounts.platform_user_id,
          social_accounts.account_name,
          social_accounts.account_handle,

          CASE
            WHEN oauth_credentials.id IS NOT NULL
            THEN 'connected'
            ELSE 'disconnected'
          END AS status,

          CASE
            WHEN oauth_credentials.id IS NOT NULL
            THEN 'connected'
            ELSE 'disconnected'
          END AS connection_status,

          oauth_credentials.expires_at,

          social_accounts.created_at,
          social_accounts.updated_at,

          projects.name AS project_name

        FROM social_accounts

        LEFT JOIN projects
          ON projects.id =
             social_accounts.project_id

        LEFT JOIN oauth_credentials
          ON oauth_credentials.social_account_id =
             social_accounts.id

        WHERE social_accounts.user_id = ?

        ORDER BY
          projects.name ASC,
          social_accounts.platform ASC,
          social_accounts.account_name ASC
      `)
      .bind(
        session.user.id
      )
      .all();

  return json(
    {
      ok: true,
      accounts:
        result.results || []
    },
    200,
    request
  );
}


export async function createAccount(
  request,
  env
) {
  const auth =
    await requireMutation(
      request,
      env
    );

  if (auth.error) {
    return auth.error;
  }

  const body =
    await readJson(request);

  if (!body) {
    return badRequest(
      request,
      "INVALID_JSON"
    );
  }

  const projectId =
    Number(body.projectId);

  const platform =
    normalizeString(
      body.platform,
      50
    ).toLowerCase();

  const accountName =
    normalizeString(
      body.accountName,
      200
    );

  const accountHandle =
    normalizeString(
      body.accountHandle,
      200
    );

  if (
    !SOCIAL_PLATFORMS.has(
      platform
    )
  ) {
    return badRequest(
      request,
      "INVALID_PLATFORM"
    );
  }

  /*
   * TikTok and YouTube accounts should now be
   * created by their OAuth callbacks.
   *
   * We retain manual creation for future/non-OAuth
   * platforms such as Instagram while it is not yet
   * integrated.
   */
  if (
    platform === "tiktok" ||
    platform === "youtube"
  ) {
    return badRequest(
      request,
      "USE_OAUTH_TO_CONNECT_ACCOUNT"
    );
  }

  if (!accountName) {
    return badRequest(
      request,
      "ACCOUNT_NAME_REQUIRED"
    );
  }

  try {
    await assertOwnedProject(
      env,
      auth.session.user.id,
      projectId
    );
  } catch {
    return badRequest(
      request,
      "INVALID_PROJECT"
    );
  }

  const result =
    await env.DB
      .prepare(`
        INSERT INTO social_accounts (
          user_id,
          project_id,
          platform,
          account_name,
          account_handle,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?,
          'disconnected',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `)
      .bind(
        auth.session.user.id,
        projectId,
        platform,
        accountName,
        accountHandle || null
      )
      .run();

  await writeAudit(
    env,
    auth.session.user.id,
    "SOCIAL_ACCOUNT_CREATED",
    "social_account",
    String(
      result.meta.last_row_id
    ),
    request
  );

  return json(
    {
      ok: true,
      id:
        result.meta.last_row_id
    },
    201,
    request
  );
}


export async function disconnectSocialAccount(
  request,
  env,
  accountId
) {
  const auth =
    await requireMutation(
      request,
      env
    );

  if (auth.error) {
    return auth.error;
  }

  const account =
    await env.DB
      .prepare(`
        SELECT
          id,
          platform
        FROM social_accounts
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
      `)
      .bind(
        accountId,
        auth.session.user.id
      )
      .first();

  if (!account) {
    return json(
      {
        ok: false,
        error:
          "ACCOUNT_NOT_FOUND"
      },
      404,
      request
    );
  }

  await env.DB
    .prepare(`
      DELETE FROM oauth_credentials
      WHERE social_account_id = ?
    `)
    .bind(accountId)
    .run();

  await env.DB
    .prepare(`
      UPDATE social_accounts
      SET
        status = 'disconnected',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
      AND user_id = ?
    `)
    .bind(
      accountId,
      auth.session.user.id
    )
    .run();

  await writeAudit(
    env,
    auth.session.user.id,
    "SOCIAL_ACCOUNT_DISCONNECTED",
    "social_account",
    String(accountId),
    request
  );

  return json(
    {
      ok: true
    },
    200,
    request
  );
}


export async function upsertSocialAccount(
  env,
  {
    userId,
    projectId,
    platform,
    platformUserId,
    accountName,
    accountHandle
  }
) {
  if (
    !userId ||
    !projectId ||
    !platform ||
    !platformUserId
  ) {
    throw new Error(
      "INVALID_SOCIAL_ACCOUNT"
    );
  }

  const cleanName =
    String(
      accountName ||
      platform
    ).slice(
      0,
      200
    );

  const cleanHandle =
    accountHandle
      ? String(
          accountHandle
        ).slice(
          0,
          200
        )
      : null;

  /*
   * First search by the provider's immutable account ID.
   *
   * This means reconnecting the same TikTok/YouTube
   * account updates the existing record instead of
   * creating duplicates.
   */
  const existing =
    await env.DB
      .prepare(`
        SELECT id
        FROM social_accounts
        WHERE user_id = ?
        AND project_id = ?
        AND platform = ?
        AND platform_user_id = ?
        LIMIT 1
      `)
      .bind(
        userId,
        projectId,
        platform,
        platformUserId
      )
      .first();

  if (existing) {
    await env.DB
      .prepare(`
        UPDATE social_accounts
        SET
          account_name = ?,
          account_handle = ?,
          status = 'connected',
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = ?
        AND user_id = ?
      `)
      .bind(
        cleanName,
        cleanHandle,
        existing.id,
        userId
      )
      .run();

    return existing.id;
  }

  /*
   * Clean up an old disconnected placeholder where
   * possible instead of leaving duplicate cards behind.
   */
  const placeholder =
    await env.DB
      .prepare(`
        SELECT
          social_accounts.id
        FROM social_accounts

        LEFT JOIN oauth_credentials
          ON oauth_credentials.social_account_id =
             social_accounts.id

        WHERE social_accounts.user_id = ?
        AND social_accounts.project_id = ?
        AND social_accounts.platform = ?
        AND social_accounts.platform_user_id IS NULL
        AND oauth_credentials.id IS NULL

        ORDER BY social_accounts.id ASC
        LIMIT 1
      `)
      .bind(
        userId,
        projectId,
        platform
      )
      .first();

  if (placeholder) {
    await env.DB
      .prepare(`
        UPDATE social_accounts
        SET
          platform_user_id = ?,
          account_name = ?,
          account_handle = ?,
          status = 'connected',
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = ?
        AND user_id = ?
      `)
      .bind(
        platformUserId,
        cleanName,
        cleanHandle,
        placeholder.id,
        userId
      )
      .run();

    return placeholder.id;
  }

  const result =
    await env.DB
      .prepare(`
        INSERT INTO social_accounts (
          user_id,
          project_id,
          platform,
          platform_user_id,
          account_name,
          account_handle,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?,
          'connected',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `)
      .bind(
        userId,
        projectId,
        platform,
        platformUserId,
        cleanName,
        cleanHandle
      )
      .run();

  return result.meta.last_row_id;
}
