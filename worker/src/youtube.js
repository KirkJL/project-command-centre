"use strict";

import {
  YOUTUBE_REDIRECT_URI
} from "./config.js";

import {
  json,
  badRequest,
  readJson,
  normalizeString,
  safeJson
} from "./http.js";

import {
  requireMutation
} from "./auth.js";

import {
  assertOwnedProject
} from "./projects.js";

import {
  createSecureToken
} from "./security.js";

import {
  requireOAuthSecrets,
  cleanupOAuthStates,
  consumeOAuthState,
  saveOAuthCredentials,
  oauthRedirect
} from "./oauth.js";

import {
  upsertSocialAccount
} from "./accounts.js";

export async function startYouTubeOAuth(
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
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
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
        ?, ?, 'youtube',
        ?, NULL, ?
      )
    `)
    .bind(
      state,
      auth.session.user.id,
      projectId,
      new Date(
        Date.now() +
        10 * 60 * 1000
      ).toISOString()
    )
    .run();

  const params =
    new URLSearchParams({
      client_id:
        env.GOOGLE_CLIENT_ID,

      redirect_uri:
        YOUTUBE_REDIRECT_URI,

      response_type:
        "code",

      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
      ].join(" "),

      access_type:
        "offline",

      prompt:
        "consent",

      include_granted_scopes:
        "true",

      state
    });

  return json(
    {
      ok: true,

      authorizationUrl:
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        params.toString()
    },
    200,
    request
  );
}

export async function finishYouTubeOAuth(
  request,
  env
) {
  try {
    requireOAuthSecrets(
      env,
      [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
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
        "youtube",
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
        "youtube",
        false,
        "missing_code_or_state"
      );
    }

    const oauthState =
      await consumeOAuthState(
        env,
        state,
        "youtube"
      );

    if (!oauthState) {
      return oauthRedirect(
        "youtube",
        false,
        "invalid_or_expired_state"
      );
    }

    const tokenResponse =
      await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body:
            new URLSearchParams({
              client_id:
                env.GOOGLE_CLIENT_ID,

              client_secret:
                env.GOOGLE_CLIENT_SECRET,

              code,

              grant_type:
                "authorization_code",

              redirect_uri:
                YOUTUBE_REDIRECT_URI
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
        "youtube",
        false,
        "token_exchange_failed"
      );
    }

    const channelResponse =
      await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
        {
          headers: {
            Authorization:
              `Bearer ${tokenData.access_token}`
          }
        }
      );

    const channelData =
      await safeJson(
        channelResponse
      );

    const channel =
      channelData?.items?.[0];

    if (
      !channelResponse.ok ||
      !channel
    ) {
      return oauthRedirect(
        "youtube",
        false,
        "channel_lookup_failed"
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
            "youtube",

          platformUserId:
            channel.id,

          accountName:
            channel.snippet
              ?.title ||
            "YouTube",

          accountHandle:
            channel.snippet
              ?.customUrl ||
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
      "youtube",
      tokenData.access_token,
      tokenData.refresh_token ||
        null,
      expiresAt,
      tokenData.scope || ""
    );

    return oauthRedirect(
      "youtube",
      true
    );
  } catch (error) {
    console.error(
      "YouTube callback:",
      error
    );

    return oauthRedirect(
      "youtube",
      false,
      "internal_error"
    );
  }
      }
