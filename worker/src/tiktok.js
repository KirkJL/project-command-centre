"use strict";

import {
  TIKTOK_REDIRECT_URI
} from "./config.js";

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
  assertOwnedProject
} from "./projects.js";

import {
  createSecureToken,
  createPkceVerifier,
  createPkceChallenge
} from "./security.js";

import {
  requireOAuthSecrets,
  cleanupOAuthStates,
  consumeOAuthState,
  saveOAuthCredentials,
  getOAuthCredential,
  getValidAccessToken,
  oauthRedirect
} from "./oauth.js";

import {
  upsertSocialAccount
} from "./accounts.js";

export async function startTikTokOAuth(
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

  requireOAuthSecrets(
    env,
    [
      "TIKTOK_CLIENT_KEY",
      "TIKTOK_CLIENT_SECRET",
      "TOKEN_ENCRYPTION_KEY"
    ]
  );

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

  await cleanupOAuthStates(
    env
  );

  const state =
    createSecureToken();

  const verifier =
    createPkceVerifier();

  const challenge =
    await createPkceChallenge(
      verifier
    );

  await env.DB
    .prepare(`
      INSERT INTO oauth_states (
        id,
        user_id,
        provider,
        project_id,
        code_verifier,
        expires_at
      )
      VALUES (
        ?, ?, 'tiktok',
        ?, ?, ?
      )
    `)
    .bind(
      state,
      auth.session.user.id,
      projectId,
      verifier,
      new Date(
        Date.now() +
        10 * 60 * 1000
      ).toISOString()
    )
    .run();

  const params =
    new URLSearchParams({
      client_key:
        env.TIKTOK_CLIENT_KEY,

      response_type:
        "code",

      scope:
        "user.info.basic,video.publish",

      redirect_uri:
        TIKTOK_REDIRECT_URI,

      state,

      code_challenge:
        challenge,

      code_challenge_method:
        "S256"
    });

  return json(
    {
      ok: true,

      authorizationUrl:
        "https://www.tiktok.com/v2/auth/authorize/?" +
        params.toString()
    },
    200,
    request
  );
}

export async function finishTikTokOAuth(
  request,
  env
) {
  try {
    requireOAuthSecrets(
      env,
      [
        "TIKTOK_CLIENT_KEY",
        "TIKTOK_CLIENT_SECRET",
        "TOKEN_ENCRYPTION_KEY"
      ]
    );

    const url =
      new URL(request.url);

    const providerError =
      normalizeString(
        url.searchParams.get(
          "error"
        ),
        500
      );

    if (providerError) {
      return oauthRedirect(
        "tiktok",
        false,
        providerError
      );
    }

    const code =
      normalizeString(
        url.searchParams.get(
          "code"
        ),
        4000
      );

    const state =
      normalizeString(
        url.searchParams.get(
          "state"
        ),
        500
      );

    if (!code || !state) {
      return oauthRedirect(
        "tiktok",
        false,
        "missing_code_or_state"
      );
    }

    const oauthState =
      await consumeOAuthState(
        env,
        state,
        "tiktok"
      );

    if (!oauthState) {
      return oauthRedirect(
        "tiktok",
        false,
        "invalid_or_expired_state"
      );
    }

    const tokenResponse =
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

              code,

              grant_type:
                "authorization_code",

              redirect_uri:
                TIKTOK_REDIRECT_URI,

              code_verifier:
                oauthState.code_verifier
            })
        }
      );

    const tokenData =
      await safeJson(
        tokenResponse
      );

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      return oauthRedirect(
        "tiktok",
        false,
        "token_exchange_failed"
      );
    }

    const userResponse =
      await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
        {
          headers: {
            Authorization:
              `Bearer ${tokenData.access_token}`
          }
        }
      );

    const userData =
      await safeJson(
        userResponse
      );

    const tiktokUser =
      userData?.data?.user ||
      {};

    const platformUserId =
      tokenData.open_id ||
      tiktokUser.open_id;

    if (!platformUserId) {
      return oauthRedirect(
        "tiktok",
        false,
        "account_lookup_failed"
      );
    }

    const accountId =
      await upsertSocialAccount(
        env,
        {
          userId:
            oauthState.user_id,

          projectId:
            oauthState.project_id,

          platform:
            "tiktok",

          platformUserId,

          accountName:
            tiktokUser.display_name ||
            "TikTok",

          accountHandle:
            null
        }
      );

    const expiresAt =
      tokenData.expires_in
        ? new Date(
            Date.now() +
            Number(
              tokenData.expires_in
            ) *
              1000
          ).toISOString()
        : null;

    await saveOAuthCredentials(
      env,
      accountId,
      "tiktok",
      tokenData.access_token,
      tokenData.refresh_token ||
        null,
      expiresAt,
      tokenData.scope || ""
    );

    return oauthRedirect(
      "tiktok",
      true
    );
  } catch (error) {
    console.error(
      "TikTok callback:",
      error
    );

    return oauthRedirect(
      "tiktok",
      false,
      "internal_error"
    );
  }
}

export async function getTikTokCreatorInfo(
  request,
  env,
  accountId
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
        session.user.id
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

  if (
    account.platform !==
    "tiktok"
  ) {
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
        error:
          "ACCOUNT_NOT_CONNECTED"
      },
      409,
      request
    );
  }

  const accessToken =
    await getValidAccessToken(
      env,
      credential
    );

  const response =
    await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json; charset=UTF-8"
        },

        body:
          JSON.stringify({})
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json(
      {
        ok: false,
        error:
          "TIKTOK_CREATOR_INFO_FAILED"
      },
      502,
      request
    );
  }

  return json(
    {
      ok: true,
      creatorInfo:
        data?.data || null
    },
    200,
    request
  );
}
