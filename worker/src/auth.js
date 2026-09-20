"use strict";

import {
  SESSION_COOKIE,
  SESSION_LENGTH_SECONDS
} from "./config.js";

import {
  json,
  badRequest,
  unauthenticated,
  readJson,
  normalizeString,
  csrfFailure
} from "./http.js";

import {
  createSecureToken,
  createSessionCookie,
  parseCookies,
  validCsrf,
  verifyPassword,
  delayFailure
} from "./security.js";

import {
  writeAudit
} from "./audit.js";

export async function login(
  request,
  env
) {
  const body =
    await readJson(request);

  if (!body) {
    return badRequest(
      request,
      "INVALID_JSON"
    );
  }

  const username =
    normalizeString(
      body.username,
      100
    ).toLowerCase();

  const password =
    normalizeString(
      body.password,
      500
    );

  if (
    !username ||
    !password
  ) {
    return badRequest(
      request,
      "USERNAME_AND_PASSWORD_REQUIRED"
    );
  }

  const user =
    await env.DB
      .prepare(`
        SELECT
          id,
          username,
          display_name,
          password_hash
        FROM users
        WHERE LOWER(username) = ?
        LIMIT 1
      `)
      .bind(username)
      .first();

  if (!user) {
    await delayFailure();

    return json(
      {
        ok: false,
        error:
          "INVALID_CREDENTIALS"
      },
      401,
      request
    );
  }

  const valid =
    await verifyPassword(
      password,
      user.password_hash
    );

  if (!valid) {
    await delayFailure();

    return json(
      {
        ok: false,
        error:
          "INVALID_CREDENTIALS"
      },
      401,
      request
    );
  }

  const sessionId =
    crypto.randomUUID();

  const csrfToken =
    createSecureToken();

  const expires =
    new Date(
      Date.now() +
      SESSION_LENGTH_SECONDS *
        1000
    );

  await env.DB
    .prepare(`
      INSERT INTO sessions (
        id,
        user_id,
        expires_at,
        csrf_token
      )
      VALUES (?, ?, ?, ?)
    `)
    .bind(
      sessionId,
      user.id,
      expires.toISOString(),
      csrfToken
    )
    .run();

  await writeAudit(
    env,
    user.id,
    "LOGIN",
    "user",
    String(user.id),
    request
  );

  return json(
    {
      ok: true,
      csrfToken,
      user: {
        id: user.id,
        username:
          user.username,
        displayName:
          user.display_name
      }
    },
    200,
    request,
    {
      "Set-Cookie":
        createSessionCookie(
          sessionId
        )
    }
  );
}

export async function logout(
  request,
  env
) {
  const session =
    await requireSession(
      request,
      env
    );

  if (session) {
    if (
      !validCsrf(
        request,
        session
      )
    ) {
      return csrfFailure(
        request
      );
    }

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE id = ?
      `)
      .bind(
        session.sessionId
      )
      .run();
  }

  return json(
    {
      ok: true
    },
    200,
    request,
    {
      "Set-Cookie":
        `${SESSION_COOKIE}=; ` +
        "Path=/; HttpOnly; " +
        "Secure; SameSite=None; " +
        "Max-Age=0"
    }
  );
}

export async function me(
  request,
  env
) {
  const session =
    await requireSession(
      request,
      env
    );

  if (!session) {
    return unauthenticated(
      request
    );
  }

  return json(
    {
      ok: true,
      csrfToken:
        session.csrfToken,
      user:
        session.user
    },
    200,
    request
  );
}

export async function requireSession(
  request,
  env
) {
  const cookies =
    parseCookies(
      request.headers.get(
        "Cookie"
      ) || ""
    );

  const sessionId =
    cookies[
      SESSION_COOKIE
    ];

  if (!sessionId) {
    return null;
  }

  const session =
    await env.DB
      .prepare(`
        SELECT
          sessions.id,
          sessions.user_id,
          sessions.expires_at,
          sessions.csrf_token,
          users.username,
          users.display_name
        FROM sessions
        INNER JOIN users
          ON users.id =
             sessions.user_id
        WHERE sessions.id = ?
        LIMIT 1
      `)
      .bind(sessionId)
      .first();

  if (!session) {
    return null;
  }

  const expiry =
    Date.parse(
      session.expires_at
    );

  if (
    !Number.isFinite(expiry) ||
    expiry <= Date.now()
  ) {
    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE id = ?
      `)
      .bind(sessionId)
      .run();

    return null;
  }

  return {
    sessionId:
      session.id,

    csrfToken:
      session.csrf_token,

    user: {
      id:
        session.user_id,

      username:
        session.username,

      displayName:
        session.display_name
    }
  };
}

export async function requireMutation(
  request,
  env
) {
  const session =
    await requireSession(
      request,
      env
    );

  if (!session) {
    return {
      error:
        unauthenticated(
          request
        )
    };
  }

  if (
    !validCsrf(
      request,
      session
    )
  ) {
    return {
      error:
        csrfFailure(
          request
        )
    };
  }

  return {
    session
  };
}
