"use strict";

import {
  FRONTEND_URL
} from "./config.js";

import {
  encryptSecret,
  decryptSecret
} from "./security.js";


export function requireOAuthSecrets(
  env,
  names
) {
  for (const name of names) {
    if (
      typeof env[name] !==
        "string" ||
      !env[name].trim()
    ) {
      throw new Error(
        `${name}_NOT_CONFIGURED`
      );
    }
  }
}


export function optionalSecret(
  env,
  name
) {
  if (
    typeof env[name] !==
      "string"
  ) {
    return null;
  }

  const value =
    env[name].trim();

  return value || null;
}


export function oauthRedirect(
  provider,
  success,
  error = ""
) {
  const target =
    new URL(FRONTEND_URL);

  target.searchParams.set(
    "oauth",
    provider
  );

  target.searchParams.set(
    "oauthStatus",
    success
      ? "success"
      : "error"
  );

  if (error) {
    target.searchParams.set(
      "oauthError",
      String(error).slice(
        0,
        200
      )
    );
  }

  return Response.redirect(
    target.toString(),
    302
  );
}


export async function consumeOAuthState(
  env,
  state,
  provider
) {
  const record =
    await env.DB
      .prepare(`
        SELECT
          id,
          user_id,
          provider,
          project_id,
          code_verifier,
          expires_at
        FROM oauth_states
        WHERE id = ?
        AND provider = ?
        LIMIT 1
      `)
      .bind(
        state,
        provider
      )
      .first();

  if (!record) {
    return null;
  }

  /*
   * State values are one-use only.
   */
  await env.DB
    .prepare(`
      DELETE FROM oauth_states
      WHERE id = ?
    `)
    .bind(state)
    .run();

  const expiry =
    Date.parse(
      record.expires_at
    );

  if (
    !Number.isFinite(expiry) ||
    expiry < Date.now()
  ) {
    return null;
  }

  return record;
}


export async function cleanupOAuthStates(
  env
) {
  try {
    await env.DB
      .prepare(`
        DELETE FROM oauth_states
        WHERE datetime(expires_at)
          < datetime('now')
      `)
      .run();
  } catch (error) {
    console.error(
      "OAuth state cleanup failed:",
      error
    );
  }
}


export async function saveOAuthCredentials(
  env,
  socialAccountId,
  provider,
  accessToken,
  refreshToken,
  expiresAt,
  scope
) {
  requireOAuthSecrets(
    env,
    [
      "TOKEN_ENCRYPTION_KEY"
    ]
  );

  if (!accessToken) {
    throw new Error(
      "ACCESS_TOKEN_REQUIRED"
    );
  }

  const encryptedAccess =
    await encryptSecret(
      env,
      accessToken
    );

  const encryptedRefresh =
    refreshToken
      ? await encryptSecret(
          env,
          refreshToken
        )
      : null;

  const existing =
    await env.DB
      .prepare(`
        SELECT id
        FROM oauth_credentials
        WHERE social_account_id = ?
        LIMIT 1
      `)
      .bind(
        socialAccountId
      )
      .first();

  if (existing) {
    /*
     * Some providers do not return a new refresh token
     * every time. If no new refresh token is returned,
     * preserve the one already stored.
     */
    if (encryptedRefresh) {
      await env.DB
        .prepare(`
          UPDATE oauth_credentials
          SET
            provider = ?,
            access_token_encrypted = ?,
            refresh_token_encrypted = ?,
            expires_at = ?,
            scope = ?,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE social_account_id = ?
        `)
        .bind(
          provider,
          encryptedAccess,
          encryptedRefresh,
          expiresAt,
          scope || "",
          socialAccountId
        )
        .run();
    } else {
      await env.DB
        .prepare(`
          UPDATE oauth_credentials
          SET
            provider = ?,
            access_token_encrypted = ?,
            expires_at = ?,
            scope = ?,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE social_account_id = ?
        `)
        .bind(
          provider,
          encryptedAccess,
          expiresAt,
          scope || "",
          socialAccountId
        )
        .run();
    }

    return;
  }

  await env.DB
    .prepare(`
      INSERT INTO oauth_credentials (
        social_account_id,
        provider,
        access_token_encrypted,
        refresh_token_encrypted,
        expires_at,
        scope,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        CURRENT_TIMESTAMP
      )
    `)
    .bind(
      socialAccountId,
      provider,
      encryptedAccess,
      encryptedRefresh,
      expiresAt,
      scope || ""
    )
    .run();
}


export async function getOAuthCredential(
  env,
  socialAccountId
) {
  return env.DB
    .prepare(`
      SELECT
        id,
        social_account_id,
        provider,
        access_token_encrypted,
        refresh_token_encrypted,
        expires_at,
        scope
      FROM oauth_credentials
      WHERE social_account_id = ?
      LIMIT 1
    `)
    .bind(
      socialAccountId
    )
    .first();
}


export async function getValidAccessToken(
  env,
  credential
) {
  if (!credential) {
    throw new Error(
      "OAUTH_CREDENTIAL_REQUIRED"
    );
  }

  const expiresAt =
    credential.expires_at
      ? Date.parse(
          credential.expires_at
        )
      : 0;

  if (
    expiresAt &&
    expiresAt >
      Date.now() +
        5 * 60 * 1000
  ) {
    return decryptSecret(
      env,
      credential
        .access_token_encrypted
    );
  }

  /*
   * Some credentials may not have a known expiry.
   */
  if (!expiresAt) {
    return decryptSecret(
      env,
      credential
        .access_token_encrypted
    );
  }

  if (
    !credential
      .refresh_token_encrypted
  ) {
    throw new Error(
      "OAUTH_REAUTH_REQUIRED"
    );
  }

  if (
    credential.provider ===
    "youtube"
  ) {
    return refreshYouTubeToken(
      env,
      credential
    );
  }

  if (
    credential.provider ===
    "tiktok"
  ) {
    return refreshTikTokToken(
      env,
      credential
    );
  }

  throw new Error(
    "UNSUPPORTED_OAUTH_PROVIDER"
  );
}


async function refreshYouTubeToken(
  env,
  credential
) {
  requireOAuthSecrets(
    env,
    [
      "GOOGLE_CLIENT_ID",
      "TOKEN_ENCRYPTION_KEY"
    ]
  );

  const refreshToken =
    await decryptSecret(
      env,
      credential
        .refresh_token_encrypted
    );

  const body =
    new URLSearchParams({
      client_id:
        env.GOOGLE_CLIENT_ID,

      refresh_token:
        refreshToken,

      grant_type:
        "refresh_token"
    });

  const googleSecret =
    optionalSecret(
      env,
      "GOOGLE_CLIENT_SECRET"
    );

  if (googleSecret) {
    body.set(
      "client_secret",
      googleSecret
    );
  }

  const response =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.access_token
  ) {
    console.error(
      "YouTube token refresh failed:",
      data?.error || response.status
    );

    throw new Error(
      "YOUTUBE_TOKEN_REFRESH_FAILED"
    );
  }

  const expiresAt =
    data.expires_in
      ? new Date(
          Date.now() +
          Number(
            data.expires_in
          ) *
            1000
        ).toISOString()
      : null;

  await saveOAuthCredentials(
    env,
    credential.social_account_id,
    "youtube",
    data.access_token,
    data.refresh_token || null,
    expiresAt,
    data.scope ||
      credential.scope ||
      ""
  );

  return data.access_token;
}


async function refreshTikTokToken(
  env,
  credential
) {
  requireOAuthSecrets(
    env,
    [
      "TIKTOK_CLIENT_KEY",
      "TIKTOK_CLIENT_SECRET",
      "TOKEN_ENCRYPTION_KEY"
    ]
  );

  const refreshToken =
    await decryptSecret(
      env,
      credential
        .refresh_token_encrypted
    );

  const response =
    await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body:
          new URLSearchParams({
            client_key:
              env.TIKTOK_CLIENT_KEY,

            client_secret:
              env.TIKTOK_CLIENT_SECRET,

            grant_type:
              "refresh_token",

            refresh_token:
              refreshToken
          })
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.access_token
  ) {
    console.error(
      "TikTok token refresh failed:",
      data?.error || response.status
    );

    throw new Error(
      "TIKTOK_TOKEN_REFRESH_FAILED"
    );
  }

  const expiresAt =
    data.expires_in
      ? new Date(
          Date.now() +
          Number(
            data.expires_in
          ) *
            1000
        ).toISOString()
      : null;

  await saveOAuthCredentials(
    env,
    credential.social_account_id,
    "tiktok",
    data.access_token,
    data.refresh_token ||
      refreshToken,
    expiresAt,
    data.scope ||
      credential.scope ||
      ""
  );

  return data.access_token;
        }
