"use strict";

/* =========================================================
   PROJECT COMMAND CENTRE API
   Build 3A
   ========================================================= */

const ALLOWED_ORIGINS = new Set([
  "https://kirkjl.github.io"
]);

const FRONTEND_URL =
  "https://kirkjl.github.io/project-command-centre/";

const TIKTOK_REDIRECT_URI =
  "https://project-hub-api.kirkjlemon.workers.dev/api/oauth/tiktok/callback";

const YOUTUBE_REDIRECT_URI =
  "https://project-hub-api.kirkjlemon.workers.dev/api/oauth/youtube/callback";

const SESSION_COOKIE = "project_hub_session";
const SESSION_LENGTH_SECONDS = 60 * 60 * 24 * 7;

const PROJECT_TYPES = new Set([
  "content",
  "software",
  "game",
  "brand",
  "website",
  "custom"
]);

const CONTENT_TYPES = new Set([
  "video",
  "image",
  "carousel",
  "text"
]);

const CONTENT_STATUSES = new Set([
  "idea",
  "script",
  "recording",
  "editing",
  "ready",
  "scheduled",
  "published",
  "archived"
]);

const SOCIAL_PLATFORMS = new Set([
  "tiktok",
  "youtube",
  "instagram"
]);


/* =========================================================
   WORKER ENTRY
   ========================================================= */

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error("Unhandled Worker error:", error);

      return json(
        {
          ok: false,
          error: "INTERNAL_SERVER_ERROR"
        },
        500,
        request
      );
    }
  }
};


/* =========================================================
   ROUTER
   ========================================================= */

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(
      {
        ok: false,
        error: "ORIGIN_NOT_ALLOWED"
      },
      403,
      request
    );
  }

  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  if (url.pathname === "/" && request.method === "GET") {
    return json(
      {
        ok: true,
        service: "Project Hub API",
        version: "3A"
      },
      200,
      request
    );
  }

  if (
    url.pathname === "/api/health" &&
    request.method === "GET"
  ) {
    return json(
      {
        ok: true,
        status: "healthy",
        version: "3A"
      },
      200,
      request
    );
  }

  /* AUTH */

  if (
    url.pathname === "/api/auth/login" &&
    request.method === "POST"
  ) {
    return login(request, env);
  }

  if (
    url.pathname === "/api/auth/logout" &&
    request.method === "POST"
  ) {
    return logout(request, env);
  }

  if (
    url.pathname === "/api/auth/me" &&
    request.method === "GET"
  ) {
    return me(request, env);
  }

  /* DASHBOARD */

  if (
    url.pathname === "/api/dashboard" &&
    request.method === "GET"
  ) {
    return dashboard(request, env);
  }

  /* PROJECTS */

  if (
    url.pathname === "/api/projects" &&
    request.method === "GET"
  ) {
    return getProjects(request, env);
  }

  if (
    url.pathname === "/api/projects" &&
    request.method === "POST"
  ) {
    return createProject(request, env);
  }

  /* CONTENT */

  if (
    url.pathname === "/api/content" &&
    request.method === "GET"
  ) {
    return getContent(request, env);
  }

  if (
    url.pathname === "/api/content" &&
    request.method === "POST"
  ) {
    return createContent(request, env);
  }

  const contentStatusMatch = url.pathname.match(
    /^\/api\/content\/(\d+)\/status$/
  );

  if (
    contentStatusMatch &&
    request.method === "PATCH"
  ) {
    return updateContentStatus(
      request,
      env,
      Number(contentStatusMatch[1])
    );
  }

  /* IDEAS */

  if (
    url.pathname === "/api/ideas" &&
    request.method === "GET"
  ) {
    return getIdeas(request, env);
  }

  if (
    url.pathname === "/api/ideas" &&
    request.method === "POST"
  ) {
    return createIdea(request, env);
  }

  /* ACCOUNTS */

  if (
    url.pathname === "/api/accounts" &&
    request.method === "GET"
  ) {
    return getAccounts(request, env);
  }

  if (
    url.pathname === "/api/accounts" &&
    request.method === "POST"
  ) {
    return createAccount(request, env);
  }

  const disconnectMatch = url.pathname.match(
    /^\/api\/accounts\/(\d+)\/disconnect$/
  );

  if (
    disconnectMatch &&
    request.method === "POST"
  ) {
    return disconnectSocialAccount(
      request,
      env,
      Number(disconnectMatch[1])
    );
  }

  const creatorInfoMatch = url.pathname.match(
    /^\/api\/accounts\/(\d+)\/creator-info$/
  );

  if (
    creatorInfoMatch &&
    request.method === "GET"
  ) {
    return getTikTokCreatorInfo(
      request,
      env,
      Number(creatorInfoMatch[1])
    );
  }

  /* CALENDAR */

  if (
    url.pathname === "/api/calendar" &&
    request.method === "GET"
  ) {
    return getCalendar(request, env);
  }

  /* TIKTOK OAUTH */

  if (
    url.pathname === "/api/oauth/tiktok/start" &&
    request.method === "POST"
  ) {
    return startTikTokOAuth(request, env);
  }

  if (
    url.pathname === "/api/oauth/tiktok/callback" &&
    request.method === "GET"
  ) {
    return finishTikTokOAuth(request, env);
  }

  /* YOUTUBE OAUTH */

  if (
    url.pathname === "/api/oauth/youtube/start" &&
    request.method === "POST"
  ) {
    return startYouTubeOAuth(request, env);
  }

  if (
    url.pathname === "/api/oauth/youtube/callback" &&
    request.method === "GET"
  ) {
    return finishYouTubeOAuth(request, env);
  }

  return json(
    {
      ok: false,
      error: "NOT_FOUND"
    },
    404,
    request
  );
}


/* =========================================================
   AUTH
   ========================================================= */

async function login(request, env) {
  const body = await readJson(request);

  if (!body) {
    return badRequest(request, "INVALID_JSON");
  }

  const username = normalizeString(
    body.username,
    100
  ).toLowerCase();

  const password = normalizeString(
    body.password,
    500
  );

  if (!username || !password) {
    return badRequest(
      request,
      "USERNAME_AND_PASSWORD_REQUIRED"
    );
  }

  const user = await env.DB
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
        error: "INVALID_CREDENTIALS"
      },
      401,
      request
    );
  }

  const valid = await verifyPassword(
    password,
    user.password_hash
  );

  if (!valid) {
    await delayFailure();

    return json(
      {
        ok: false,
        error: "INVALID_CREDENTIALS"
      },
      401,
      request
    );
  }

  const sessionId = crypto.randomUUID();
  const csrfToken = createSecureToken();

  const expires = new Date(
    Date.now() +
      SESSION_LENGTH_SECONDS * 1000
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
        username: user.username,
        displayName: user.display_name
      }
    },
    200,
    request,
    {
      "Set-Cookie": createSessionCookie(
        sessionId,
        SESSION_LENGTH_SECONDS
      )
    }
  );
}


async function logout(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (session) {
    if (!validCsrf(request, session)) {
      return csrfFailure(request);
    }

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE id = ?
      `)
      .bind(session.sessionId)
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
        "Path=/; HttpOnly; Secure; " +
        "SameSite=None; Max-Age=0"
    }
  );
}


async function me(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  return json(
    {
      ok: true,
      csrfToken: session.csrfToken,
      user: session.user
    },
    200,
    request
  );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboard(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  const user = session.user;

  const [
    projects,
    tasks,
    publications,
    recentContent,
    ideas
  ] = await Promise.all([
    env.DB
      .prepare(`
        SELECT
          id,
          name,
          slug,
          project_type,
          status,
          accent_colour
        FROM projects
        WHERE user_id = ?
        AND status != 'archived'
        ORDER BY updated_at DESC
        LIMIT 8
      `)
      .bind(user.id)
      .all(),

    env.DB
      .prepare(`
        SELECT
          tasks.id,
          tasks.title,
          tasks.status,
          tasks.priority,
          tasks.due_at,
          projects.name AS project_name
        FROM tasks
        LEFT JOIN projects
          ON projects.id = tasks.project_id
        WHERE tasks.user_id = ?
        AND tasks.status NOT IN (
          'done',
          'cancelled'
        )
        ORDER BY
          CASE tasks.priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            ELSE 4
          END,
          tasks.due_at ASC
        LIMIT 10
      `)
      .bind(user.id)
      .all(),

    env.DB
      .prepare(`
        SELECT
          publications.id,
          publications.platform,
          publications.publish_state,
          publications.scheduled_at,
          content.title,
          social_accounts.account_name
        FROM publications
        INNER JOIN content
          ON content.id =
             publications.content_id
        INNER JOIN social_accounts
          ON social_accounts.id =
             publications.social_account_id
        WHERE content.user_id = ?
        AND publications.publish_state IN (
          'ready',
          'queued',
          'processing',
          'retrying'
        )
        ORDER BY
          publications.scheduled_at ASC
        LIMIT 10
      `)
      .bind(user.id)
      .all(),

    env.DB
      .prepare(`
        SELECT
          content.id,
          content.project_id,
          content.title,
          content.content_type,
          content.status,
          content.updated_at,
          projects.name AS project_name
        FROM content
        INNER JOIN projects
          ON projects.id =
             content.project_id
        WHERE content.user_id = ?
        AND content.status != 'archived'
        ORDER BY
          content.updated_at DESC
        LIMIT 8
      `)
      .bind(user.id)
      .all(),

    env.DB
      .prepare(`
        SELECT COUNT(*) AS total
        FROM ideas
        WHERE user_id = ?
        AND status = 'inbox'
      `)
      .bind(user.id)
      .first()
  ]);

  return json(
    {
      ok: true,
      user,
      projects: projects.results || [],
      tasks: tasks.results || [],
      publications:
        publications.results || [],
      recentContent:
        recentContent.results || [],
      ideaCount:
        Number(ideas?.total || 0)
    },
    200,
    request
  );
}


/* =========================================================
   PROJECTS
   ========================================================= */

async function getProjects(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  const result = await env.DB
    .prepare(`
      SELECT
        projects.id,
        projects.name,
        projects.slug,
        projects.description,
        projects.project_type,
        projects.status,
        projects.accent_colour,
        projects.created_at,
        projects.updated_at,

        (
          SELECT COUNT(*)
          FROM content
          WHERE content.project_id =
            projects.id
        ) AS content_count,

        (
          SELECT COUNT(*)
          FROM social_accounts
          WHERE social_accounts.project_id =
            projects.id
        ) AS account_count

      FROM projects

      WHERE projects.user_id = ?

      ORDER BY
        CASE projects.status
          WHEN 'active' THEN 1
          WHEN 'paused' THEN 2
          WHEN 'completed' THEN 3
          ELSE 4
        END,
        projects.updated_at DESC
    `)
    .bind(session.user.id)
    .all();

  return json(
    {
      ok: true,
      projects: result.results || []
    },
    200,
    request
  );
}


async function createProject(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  if (!validCsrf(request, session)) {
    return csrfFailure(request);
  }

  const body = await readJson(request);

  if (!body) {
    return badRequest(request, "INVALID_JSON");
  }

  const name = normalizeString(
    body.name,
    100
  );

  const description = normalizeString(
    body.description,
    2000
  );

  let projectType = normalizeString(
    body.projectType,
    50
  ).toLowerCase();

  if (!PROJECT_TYPES.has(projectType)) {
    projectType = "custom";
  }

  const accentColour = normalizeColour(
    body.accentColour
  );

  if (!name) {
    return badRequest(
      request,
      "PROJECT_NAME_REQUIRED"
    );
  }

  const slug = await createUniqueProjectSlug(
    env,
    session.user.id,
    name
  );

  const result = await env.DB
    .prepare(`
      INSERT INTO projects (
        user_id,
        name,
        slug,
        description,
        project_type,
        status,
        accent_colour,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?,
        'active',
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `)
    .bind(
      session.user.id,
      name,
      slug,
      description || null,
      projectType,
      accentColour
    )
    .run();

  await writeAudit(
    env,
    session.user.id,
    "PROJECT_CREATED",
    "project",
    String(result.meta.last_row_id),
    request
  );

  return json(
    {
      ok: true,
      id: result.meta.last_row_id
    },
    201,
    request
  );
}


/* =========================================================
   CONTENT
   ========================================================= */

async function getContent(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  const url = new URL(request.url);

  const projectId = parseOptionalId(
    url.searchParams.get("projectId")
  );

  const status = normalizeString(
    url.searchParams.get("status"),
    50
  ).toLowerCase();

  let query = `
    SELECT
      content.id,
      content.project_id,
      content.title,
      content.description,
      content.content_type,
      content.status,
      content.created_at,
      content.updated_at,
      projects.name AS project_name,
      projects.accent_colour
    FROM content
    INNER JOIN projects
      ON projects.id =
         content.project_id
    WHERE content.user_id = ?
  `;

  const bindings = [
    session.user.id
  ];

  if (projectId) {
    query += `
      AND content.project_id = ?
    `;

    bindings.push(projectId);
  }

  if (
    status &&
    CONTENT_STATUSES.has(status)
  ) {
    query += `
      AND content.status = ?
    `;

    bindings.push(status);
  }

  query += `
    ORDER BY content.updated_at DESC
    LIMIT 250
  `;

  const result = await env.DB
    .prepare(query)
    .bind(...bindings)
    .all();

  return json(
    {
      ok: true,
      content: result.results || []
    },
    200,
    request
  );
}


async function createContent(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  if (!validCsrf(request, session)) {
    return csrfFailure(request);
  }

  const body = await readJson(request);

  if (!body) {
    return badRequest(request, "INVALID_JSON");
  }

  const projectId = Number(
    body.projectId
  );

  const title = normalizeString(
    body.title,
    200
  );

  const description = normalizeString(
    body.description,
    5000
  );

  const contentType = normalizeString(
    body.contentType,
    50
  ).toLowerCase();

  const status = normalizeString(
    body.status,
    50
  ).toLowerCase();

  if (
    !Number.isInteger(projectId) ||
    projectId < 1
  ) {
    return badRequest(
      request,
      "PROJECT_REQUIRED"
    );
  }

  if (!title) {
    return badRequest(
      request,
      "CONTENT_TITLE_REQUIRED"
    );
  }

  if (!CONTENT_TYPES.has(contentType)) {
    return badRequest(
      request,
      "INVALID_CONTENT_TYPE"
    );
  }

  if (!CONTENT_STATUSES.has(status)) {
    return badRequest(
      request,
      "INVALID_CONTENT_STATUS"
    );
  }

  const project = await env.DB
    .prepare(`
      SELECT id
      FROM projects
      WHERE id = ?
      AND user_id = ?
      LIMIT 1
    `)
    .bind(
      projectId,
      session.user.id
    )
    .first();

  if (!project) {
    return badRequest(
      request,
      "INVALID_PROJECT"
    );
  }

  const result = await env.DB
    .prepare(`
      INSERT INTO content (
        user_id,
        project_id,
        title,
        description,
        content_type,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `)
    .bind(
      session.user.id,
      projectId,
      title,
      description || null,
      contentType,
      status
    )
    .run();

  await writeAudit(
    env,
    session.user.id,
    "CONTENT_CREATED",
    "content",
    String(result.meta.last_row_id),
    request
  );

  return json(
    {
      ok: true,
      id: result.meta.last_row_id
    },
    201,
    request
  );
}


async function updateContentStatus(
  request,
  env,
  contentId
) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  if (!validCsrf(request, session)) {
    return csrfFailure(request);
  }

  const body = await readJson(request);

  if (!body) {
    return badRequest(request, "INVALID_JSON");
  }

  const status = normalizeString(
    body.status,
    50
  ).toLowerCase();

  if (!CONTENT_STATUSES.has(status)) {
    return badRequest(
      request,
      "INVALID_CONTENT_STATUS"
    );
  }

  const result = await env.DB
    .prepare(`
      UPDATE content
      SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      AND user_id = ?
    `)
    .bind(
      status,
      contentId,
      session.user.id
    )
    .run();

  if (!result.meta.changes) {
    return json(
      {
        ok: false,
        error: "CONTENT_NOT_FOUND"
      },
      404,
      request
    );
  }

  await writeAudit(
    env,
    session.user.id,
    "CONTENT_STATUS_UPDATED",
    "content",
    String(contentId),
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


/* =========================================================
   IDEAS
   ========================================================= */

async function getIdeas(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  const result = await env.DB
    .prepare(`
      SELECT
        ideas.id,
        ideas.project_id,
        ideas.title,
        ideas.description,
        ideas.idea_type,
        ideas.status,
        ideas.created_at,
        ideas.updated_at,
        projects.name AS project_name
      FROM ideas
      LEFT JOIN projects
        ON projects.id =
           ideas.project_id
      WHERE ideas.user_id = ?
      ORDER BY ideas.updated_at DESC
      LIMIT 250
    `)
    .bind(session.user.id)
    .all();

  return json(
    {
      ok: true,
      ideas: result.results || []
    },
    200,
    request
  );
}


async function createIdea(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  if (!validCsrf(request, session)) {
    return csrfFailure(request);
  }

  const body = await readJson(request);

  if (!body) {
    return badRequest(request, "INVALID_JSON");
  }

  const title = normalizeString(
    body.title,
    200
  );

  const description = normalizeString(
    body.description,
    5000
  );

  const ideaType = normalizeString(
    body.ideaType,
    100
  );

  const projectId = parseOptionalId(
    body.projectId
  );

  if (!title) {
    return badRequest(
      request,
      "IDEA_TITLE_REQUIRED"
    );
  }

  if (projectId) {
    const project = await env.DB
      .prepare(`
        SELECT id
        FROM projects
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
      `)
      .bind(
        projectId,
        session.user.id
      )
      .first();

    if (!project) {
      return badRequest(
        request,
        "INVALID_PROJECT"
      );
    }
  }

  const result = await env.DB
    .prepare(`
      INSERT INTO ideas (
        user_id,
        project_id,
        title,
        description,
        idea_type,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?,
        'inbox',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `)
    .bind(
      session.user.id,
      projectId || null,
      title,
      description || null,
      ideaType || null
    )
    .run();

  await writeAudit(
    env,
    session.user.id,
    "IDEA_CREATED",
    "idea",
    String(result.meta.last_row_id),
    request
  );

  return json(
    {
      ok: true,
      id: result.meta.last_row_id
    },
    201,
    request
  );
}


/* =========================================================
   SOCIAL ACCOUNTS
   ========================================================= */

async function getAccounts(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  const result = await env.DB
    .prepare(`
      SELECT
        social_accounts.id,
        social_accounts.project_id,
        social_accounts.platform,
        social_accounts.platform_user_id,
        social_accounts.account_name,
        social_accounts.account_handle,

        CASE
          WHEN oauth_credentials.id
            IS NOT NULL
          THEN 'connected'
          ELSE 'disconnected'
        END AS status,

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
        social_accounts.platform ASC
    `)
    .bind(session.user.id)
    .all();

  return json(
    {
      ok: true,
      accounts: result.results || []
    },
    200,
    request
  );
}


async function createAccount(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  if (!validCsrf(request, session)) {
    return csrfFailure(request);
  }

  const body = await readJson(request);

  if (!body) {
    return badRequest(request, "INVALID_JSON");
  }

  const projectId = Number(
    body.projectId
  );

  const platform = normalizeString(
    body.platform,
    50
  ).toLowerCase();

  const accountName = normalizeString(
    body.accountName,
    200
  );

  const accountHandle = normalizeString(
    body.accountHandle,
    200
  );

  if (
    !Number.isInteger(projectId) ||
    projectId < 1
  ) {
    return badRequest(
      request,
      "PROJECT_REQUIRED"
    );
  }

  if (!SOCIAL_PLATFORMS.has(platform)) {
    return badRequest(
      request,
      "INVALID_PLATFORM"
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
      session.user.id,
      projectId
    );
  } catch {
    return badRequest(
      request,
      "INVALID_PROJECT"
    );
  }

  const result = await env.DB
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
      session.user.id,
      projectId,
      platform,
      accountName,
      accountHandle || null
    )
    .run();

  await writeAudit(
    env,
    session.user.id,
    "SOCIAL_ACCOUNT_CREATED",
    "social_account",
    String(result.meta.last_row_id),
    request
  );

  return json(
    {
      ok: true,
      id: result.meta.last_row_id
    },
    201,
    request
  );
}


async function disconnectSocialAccount(
  request,
  env,
  accountId
) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  if (!validCsrf(request, session)) {
    return csrfFailure(request);
  }

  const account = await env.DB
    .prepare(`
      SELECT
        id,
        platform,
        account_name
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
        error: "ACCOUNT_NOT_FOUND"
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      AND user_id = ?
    `)
    .bind(
      accountId,
      session.user.id
    )
    .run();

  await writeAudit(
    env,
    session.user.id,
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


/* =========================================================
   CALENDAR
   ========================================================= */

async function getCalendar(request, env) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  const result = await env.DB
    .prepare(`
      SELECT
        publications.id,
        publications.platform,
        publications.title,
        publications.caption,
        publications.publish_state,
        publications.scheduled_at,
        publications.published_at,

        content.id AS content_id,
        content.title AS content_title,

        projects.id AS project_id,
        projects.name AS project_name,

        social_accounts.id
          AS social_account_id,

        social_accounts.account_name

      FROM publications

      INNER JOIN content
        ON content.id =
           publications.content_id

      INNER JOIN projects
        ON projects.id =
           content.project_id

      INNER JOIN social_accounts
        ON social_accounts.id =
           publications.social_account_id

      WHERE content.user_id = ?

      AND (
        publications.scheduled_at
          IS NOT NULL
        OR
        publications.published_at
          IS NOT NULL
      )

      ORDER BY
        COALESCE(
          publications.scheduled_at,
          publications.published_at
        ) ASC

      LIMIT 250
    `)
    .bind(session.user.id)
    .all();

  return json(
    {
      ok: true,
      events: result.results || []
    },
    200,
    request
  );
}


/* =========================================================
   TIKTOK OAUTH
   ========================================================= */

async function startTikTokOAuth(
  request,
  env
) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  if (!validCsrf(request, session)) {
    return csrfFailure(request);
  }

  requireOAuthSecrets(env, [
    "TIKTOK_CLIENT_KEY",
    "TIKTOK_CLIENT_SECRET",
    "TOKEN_ENCRYPTION_KEY"
  ]);

  const body = await readJson(request);

  if (!body) {
    return badRequest(request, "INVALID_JSON");
  }

  const projectId = Number(
    body.projectId
  );

  try {
    await assertOwnedProject(
      env,
      session.user.id,
      projectId
    );
  } catch {
    return badRequest(
      request,
      "INVALID_PROJECT"
    );
  }

  await cleanupOAuthStates(env);

  const state = createSecureToken();
  const verifier = createPkceVerifier();

  const challenge =
    await createPkceChallenge(verifier);

  const expiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  ).toISOString();

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
      session.user.id,
      projectId,
      verifier,
      expiresAt
    )
    .run();

  const params = new URLSearchParams({
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


async function finishTikTokOAuth(
  request,
  env
) {
  try {
    requireOAuthSecrets(env, [
      "TIKTOK_CLIENT_KEY",
      "TIKTOK_CLIENT_SECRET",
      "TOKEN_ENCRYPTION_KEY"
    ]);

    const url = new URL(request.url);

    const code = normalizeString(
      url.searchParams.get("code"),
      4000
    );

    const state = normalizeString(
      url.searchParams.get("state"),
      500
    );

    const providerError =
      normalizeString(
        url.searchParams.get("error"),
        500
      );

    if (providerError) {
      return oauthRedirect(
        "tiktok",
        false,
        providerError
      );
    }

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

    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body: new URLSearchParams({
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
      await safeJson(tokenResponse);

    if (
      !tokenResponse.ok ||
      !tokenData?.access_token
    ) {
      console.error(
        "TikTok token exchange failed",
        tokenData
      );

      return oauthRedirect(
        "tiktok",
        false,
        "token_exchange_failed"
      );
    }

    const userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
      {
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`
        }
      }
    );

    const userData =
      await safeJson(userResponse);

    const tiktokUser =
      userData?.data?.user || {};

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

          accountHandle: null
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
      tokenData.refresh_token || null,
      expiresAt,
      tokenData.scope || ""
    );

    return oauthRedirect(
      "tiktok",
      true
    );
  } catch (error) {
    console.error(
      "TikTok OAuth callback error:",
      error
    );

    return oauthRedirect(
      "tiktok",
      false,
      "internal_error"
    );
  }
}


/* =========================================================
   YOUTUBE OAUTH
   ========================================================= */

async function startYouTubeOAuth(
  request,
  env
) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  if (!validCsrf(request, session)) {
    return csrfFailure(request);
  }

  requireOAuthSecrets(env, [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "TOKEN_ENCRYPTION_KEY"
  ]);

  const body = await readJson(request);

  if (!body) {
    return badRequest(request, "INVALID_JSON");
  }

  const projectId = Number(
    body.projectId
  );

  try {
    await assertOwnedProject(
      env,
      session.user.id,
      projectId
    );
  } catch {
    return badRequest(
      request,
      "INVALID_PROJECT"
    );
  }

  await cleanupOAuthStates(env);

  const state = createSecureToken();

  const expiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  ).toISOString();

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
      session.user.id,
      projectId,
      expiresAt
    )
    .run();

  const params = new URLSearchParams({
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


async function finishYouTubeOAuth(
  request,
  env
) {
  try {
    requireOAuthSecrets(env, [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "TOKEN_ENCRYPTION_KEY"
    ]);

    const url = new URL(request.url);

    const code = normalizeString(
      url.searchParams.get("code"),
      4000
    );

    const state = normalizeString(
      url.searchParams.get("state"),
      500
    );

    const providerError =
      normalizeString(
        url.searchParams.get("error"),
        500
      );

    if (providerError) {
      return oauthRedirect(
        "youtube",
        false,
        providerError
      );
    }

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

    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body: new URLSearchParams({
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
      await safeJson(tokenResponse);

    if (
      !tokenResponse.ok ||
      !tokenData?.access_token
    ) {
      console.error(
        "Google token exchange failed",
        tokenData
      );

      return oauthRedirect(
        "youtube",
        false,
        "token_exchange_failed"
      );
    }

    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
      {
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`
        }
      }
    );

    const channelData =
      await safeJson(channelResponse);

    const channel =
      channelData?.items?.[0];

    if (
      !channelResponse.ok ||
      !channel
    ) {
      console.error(
        "YouTube channel lookup failed",
        channelData
      );

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
            channel.snippet?.title ||
            "YouTube",

          accountHandle:
            channel.snippet?.customUrl ||
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
      tokenData.refresh_token || null,
      expiresAt,
      tokenData.scope || ""
    );

    return oauthRedirect(
      "youtube",
      true
    );
  } catch (error) {
    console.error(
      "YouTube OAuth callback error:",
      error
    );

    return oauthRedirect(
      "youtube",
      false,
      "internal_error"
    );
  }
}


/* =========================================================
   TIKTOK CREATOR INFO
   ========================================================= */

async function getTikTokCreatorInfo(
  request,
  env,
  accountId
) {
  const session = await requireSession(
    request,
    env
  );

  if (!session) {
    return unauthenticated(request);
  }

  const account = await env.DB
    .prepare(`
      SELECT
        id,
        platform,
        account_name,
        account_handle
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
        error: "ACCOUNT_NOT_FOUND"
      },
      404,
      request
    );
  }

  if (account.platform !== "tiktok") {
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
        error: "OAUTH_REAUTH_REQUIRED"
      },
      409,
      request
    );
  }

  const response = await fetch(
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

  const data =
    await safeJson(response);

  if (!response.ok) {
    console.error(
      "TikTok creator info failed:",
      data
    );

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


/* =========================================================
   SOCIAL ACCOUNT UPSERT
   ========================================================= */

async function upsertSocialAccount(
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
  const existing = await env.DB
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
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        accountName,
        accountHandle,
        existing.id
      )
      .run();

    return existing.id;
  }

  const result = await env.DB
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
      accountName,
      accountHandle
    )
    .run();

  return result.meta.last_row_id;
}


/* =========================================================
   OAUTH CREDENTIAL STORAGE
   ========================================================= */

async function saveOAuthCredentials(
  env,
  socialAccountId,
  provider,
  accessToken,
  refreshToken,
  expiresAt,
  scope
) {
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

  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM oauth_credentials
      WHERE social_account_id = ?
      LIMIT 1
    `)
    .bind(socialAccountId)
    .first();

  if (existing) {
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
            updated_at = CURRENT_TIMESTAMP
          WHERE social_account_id = ?
        `)
        .bind(
          provider,
          encryptedAccess,
          encryptedRefresh,
          expiresAt,
          scope,
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
            updated_at = CURRENT_TIMESTAMP
          WHERE social_account_id = ?
        `)
        .bind(
          provider,
          encryptedAccess,
          expiresAt,
          scope,
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
      scope
    )
    .run();
}


async function getOAuthCredential(
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
    .bind(socialAccountId)
    .first();
}


/* =========================================================
   ACCESS TOKEN MANAGEMENT
   ========================================================= */

async function getValidAccessToken(
  env,
  credential
) {
  const expiresAt =
    credential.expires_at
      ? Date.parse(
          credential.expires_at
        )
      : 0;

  const refreshBuffer =
    5 * 60 * 1000;

  if (
    expiresAt &&
    expiresAt >
      Date.now() + refreshBuffer
  ) {
    return decryptSecret(
      env,
      credential.access_token_encrypted
    );
  }

  if (
    !credential.refresh_token_encrypted
  ) {
    if (!expiresAt) {
      return decryptSecret(
        env,
        credential.access_token_encrypted
      );
    }

    throw new Error(
      "OAUTH_REAUTH_REQUIRED"
    );
  }

  if (
    credential.provider === "youtube"
  ) {
    return refreshYouTubeToken(
      env,
      credential
    );
  }

  if (
    credential.provider === "tiktok"
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
  requireOAuthSecrets(env, [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "TOKEN_ENCRYPTION_KEY"
  ]);

  const refreshToken =
    await decryptSecret(
      env,
      credential.refresh_token_encrypted
    );

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      body: new URLSearchParams({
        client_id:
          env.GOOGLE_CLIENT_ID,

        client_secret:
          env.GOOGLE_CLIENT_SECRET,

        refresh_token:
          refreshToken,

        grant_type:
          "refresh_token"
      })
    }
  );

  const data =
    await safeJson(response);

  if (
    !response.ok ||
    !data?.access_token
  ) {
    console.error(
      "YouTube refresh failed:",
      data
    );

    throw new Error(
      "YOUTUBE_TOKEN_REFRESH_FAILED"
    );
  }

  const expiresAt =
    data.expires_in
      ? new Date(
          Date.now() +
            Number(data.expires_in) *
              1000
        ).toISOString()
      : null;

  await saveOAuthCredentials(
    env,
    credential.social_account_id,
    "youtube",
    data.access_token,
    null,
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
  requireOAuthSecrets(env, [
    "TIKTOK_CLIENT_KEY",
    "TIKTOK_CLIENT_SECRET",
    "TOKEN_ENCRYPTION_KEY"
  ]);

  const refreshToken =
    await decryptSecret(
      env,
      credential.refresh_token_encrypted
    );

  const response = await fetch(
    "https://open.tiktokapis.com/v2/oauth/token/",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      body: new URLSearchParams({
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
    await safeJson(response);

  if (
    !response.ok ||
    !data?.access_token
  ) {
    console.error(
      "TikTok refresh failed:",
      data
    );

    throw new Error(
      "TIKTOK_TOKEN_REFRESH_FAILED"
    );
  }

  const expiresAt =
    data.expires_in
      ? new Date(
          Date.now() +
            Number(data.expires_in) *
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


/* =========================================================
   OAUTH STATE
   ========================================================= */

async function consumeOAuthState(
  env,
  state,
  provider
) {
  const record = await env.DB
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

  await env.DB
    .prepare(`
      DELETE FROM oauth_states
      WHERE id = ?
    `)
    .bind(state)
    .run();

  const expiresAt =
    Date.parse(record.expires_at);

  if (
    !Number.isFinite(expiresAt) ||
    expiresAt < Date.now()
  ) {
    return null;
  }

  return record;
}


async function cleanupOAuthStates(env) {
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


/* =========================================================
   PROJECT OWNERSHIP
   ========================================================= */

async function assertOwnedProject(
  env,
  userId,
  projectId
) {
  if (
    !Number.isInteger(projectId) ||
    projectId < 1
  ) {
    throw new Error(
      "INVALID_PROJECT"
    );
  }

  const project = await env.DB
    .prepare(`
      SELECT id
      FROM projects
      WHERE id = ?
      AND user_id = ?
      LIMIT 1
    `)
    .bind(
      projectId,
      userId
    )
    .first();

  if (!project) {
    throw new Error(
      "INVALID_PROJECT"
    );
  }

  return project;
}


/* =========================================================
   SESSIONS
   ========================================================= */

async function requireSession(
  request,
  env
) {
  const cookieHeader =
    request.headers.get("Cookie") ||
    "";

  const cookies =
    parseCookies(cookieHeader);

  const sessionId =
    cookies[SESSION_COOKIE];

  if (!sessionId) {
    return null;
  }

  const session = await env.DB
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
    Date.parse(session.expires_at);

  if (
    !Number.isFinite(expiry) ||
    expiry <= Date.now()
  ) {
    try {
      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE id = ?
        `)
        .bind(sessionId)
        .run();
    } catch (error) {
      console.error(
        "Expired session cleanup failed:",
        error
      );
    }

    return null;
  }

  return {
    sessionId: session.id,
    csrfToken:
      session.csrf_token,

    user: {
      id: session.user_id,
      username:
        session.username,
      displayName:
        session.display_name
    }
  };
}


/* =========================================================
   CSRF
   ========================================================= */

function validCsrf(
  request,
  session
) {
  const supplied =
    request.headers.get(
      "X-CSRF-Token"
    );

  if (
    !supplied ||
    !session.csrfToken
  ) {
    return false;
  }

  return constantTimeStringEqual(
    supplied,
    session.csrfToken
  );
}


function csrfFailure(request) {
  return json(
    {
      ok: false,
      error: "INVALID_CSRF_TOKEN"
    },
    403,
    request
  );
}


/* =========================================================
   PASSWORD VERIFICATION
   ========================================================= */

async function verifyPassword(
  password,
  stored
) {
  if (typeof stored !== "string") {
    return false;
  }

  const parts = stored.split(":");

  if (parts.length !== 3) {
    return false;
  }

  const iterations = Number(
    parts[0]
  );

  if (
    !Number.isInteger(iterations) ||
    iterations !== 100000
  ) {
    return false;
  }

  let salt;
  let expected;

  try {
    salt = base64ToBytes(
      parts[1]
    );

    expected = base64ToBytes(
      parts[2]
    );
  } catch {
    return false;
  }

  if (
    salt.length === 0 ||
    expected.length === 0
  ) {
    return false;
  }

  const encoder =
    new TextEncoder();

  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      {
        name: "PBKDF2"
      },
      false,
      [
        "deriveBits"
      ]
    );

  const derived =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations
      },
      keyMaterial,
      expected.length * 8
    );

  return constantTimeBytesEqual(
    new Uint8Array(derived),
    expected
  );
}


/* =========================================================
   TOKEN ENCRYPTION
   ========================================================= */

async function encryptSecret(
  env,
  plaintext
) {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED"
    );
  }

  if (typeof plaintext !== "string") {
    throw new Error(
      "INVALID_SECRET_VALUE"
    );
  }

  const key =
    await getEncryptionKey(
      env.TOKEN_ENCRYPTION_KEY
    );

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encoded =
    new TextEncoder().encode(
      plaintext
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      encoded
    );

  return [
    bytesToBase64Url(iv),
    bytesToBase64Url(
      new Uint8Array(encrypted)
    )
  ].join(".");
}


async function decryptSecret(
  env,
  encryptedValue
) {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED"
    );
  }

  if (
    typeof encryptedValue !== "string" ||
    !encryptedValue.includes(".")
  ) {
    throw new Error(
      "INVALID_ENCRYPTED_VALUE"
    );
  }

  const parts =
    encryptedValue.split(".");

  if (parts.length !== 2) {
    throw new Error(
      "INVALID_ENCRYPTED_VALUE"
    );
  }

  const iv =
    base64UrlToBytes(parts[0]);

  const encrypted =
    base64UrlToBytes(parts[1]);

  const key =
    await getEncryptionKey(
      env.TOKEN_ENCRYPTION_KEY
    );

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      encrypted
    );

  return new TextDecoder().decode(
    decrypted
  );
}


async function getEncryptionKey(secret) {
  const raw =
    new TextEncoder().encode(secret);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      raw
    );

  return crypto.subtle.importKey(
    "raw",
    digest,
    {
      name: "AES-GCM"
    },
    false,
    [
      "encrypt",
      "decrypt"
    ]
  );
}


/* =========================================================
   PKCE
   ========================================================= */

function createPkceVerifier() {
  const bytes =
    crypto.getRandomValues(
      new Uint8Array(64)
    );

  return bytesToBase64Url(bytes);
}


async function createPkceChallenge(
  verifier
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        verifier
      )
    );

  return bytesToBase64Url(
    new Uint8Array(digest)
  );
}


/* =========================================================
   PROJECT SLUGS
   ========================================================= */

function createSlug(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "project";
}


async function createUniqueProjectSlug(
  env,
  userId,
  name
) {
  const base = createSlug(name);

  let candidate = base;
  let counter = 2;

  while (counter <= 1000) {
    const existing = await env.DB
      .prepare(`
        SELECT id
        FROM projects
        WHERE user_id = ?
        AND slug = ?
        LIMIT 1
      `)
      .bind(
        userId,
        candidate
      )
      .first();

    if (!existing) {
      return candidate;
    }

    candidate =
      `${base}-${counter}`;

    counter += 1;
  }

  return `${base}-${crypto
    .randomUUID()
    .slice(0, 8)}`;
}


/* =========================================================
   OAUTH HELPERS
   ========================================================= */

function requireOAuthSecrets(
  env,
  names
) {
  for (const name of names) {
    if (
      typeof env[name] !== "string" ||
      !env[name].trim()
    ) {
      throw new Error(
        `${name}_NOT_CONFIGURED`
      );
    }
  }
}


function oauthRedirect(
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
    success ? "success" : "error"
  );

  if (error) {
    target.searchParams.set(
      "oauthError",
      String(error).slice(0, 200)
    );
  }

  return Response.redirect(
    target.toString(),
    302
  );
}


/* =========================================================
   AUDIT
   ========================================================= */

async function writeAudit(
  env,
  userId,
  action,
  entityType,
  entityId,
  request
) {
  try {
    const ip =
      request.headers.get(
        "CF-Connecting-IP"
      ) || "";

    const ipHash =
      ip
        ? await hashText(ip)
        : null;

    await env.DB
      .prepare(`
        INSERT INTO audit_log (
          user_id,
          action,
          entity_type,
          entity_id,
          ip_hash
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        userId || null,
        String(action).slice(0, 100),
        entityType
          ? String(entityType).slice(
              0,
              100
            )
          : null,
        entityId
          ? String(entityId).slice(
              0,
              200
            )
          : null,
        ipHash
      )
      .run();
  } catch (error) {
    console.error(
      "Audit write failed:",
      error
    );
  }
}


async function hashText(value) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        String(value)
      )
    );

  return bytesToHex(
    new Uint8Array(digest)
  );
}


/* =========================================================
   HTTP RESPONSES
   ========================================================= */

function json(
  data,
  status,
  request,
  extraHeaders = {}
) {
  const headers =
    securityHeaders(request);

  headers.set(
    "Content-Type",
    "application/json; charset=UTF-8"
  );

  headers.set(
    "Cache-Control",
    "no-store"
  );

  for (
    const [key, value]
    of Object.entries(extraHeaders)
  ) {
    headers.set(key, value);
  }

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers
    }
  );
}


function badRequest(
  request,
  error
) {
  return json(
    {
      ok: false,
      error
    },
    400,
    request
  );
}


function unauthenticated(request) {
  return json(
    {
      ok: false,
      error: "UNAUTHENTICATED"
    },
    401,
    request
  );
}


function handleOptions(request) {
  const origin =
    request.headers.get("Origin");

  if (
    !origin ||
    !ALLOWED_ORIGINS.has(origin)
  ) {
    return new Response(null, {
      status: 403,
      headers: securityHeaders(
        request
      )
    });
  }

  const headers =
    securityHeaders(request);

  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-CSRF-Token"
  );

  headers.set(
    "Access-Control-Max-Age",
    "86400"
  );

  return new Response(null, {
    status: 204,
    headers
  });
}


function securityHeaders(request) {
  const headers = new Headers();

  const origin =
    request.headers.get("Origin");

  if (
    origin &&
    ALLOWED_ORIGINS.has(origin)
  ) {
    headers.set(
      "Access-Control-Allow-Origin",
      origin
    );

    headers.set(
      "Access-Control-Allow-Credentials",
      "true"
    );

    headers.set(
      "Vary",
      "Origin"
    );
  }

  headers.set(
    "X-Content-Type-Options",
    "nosniff"
  );

  headers.set(
    "X-Frame-Options",
    "DENY"
  );

  headers.set(
    "Referrer-Policy",
    "no-referrer"
  );

  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  headers.set(
    "Cross-Origin-Resource-Policy",
    "cross-origin"
  );

  return headers;
}


/* =========================================================
   COOKIES
   ========================================================= */

function createSessionCookie(
  sessionId,
  maxAge
) {
  return (
    `${SESSION_COOKIE}=` +
    `${encodeURIComponent(sessionId)}; ` +
    "Path=/; " +
    "HttpOnly; " +
    "Secure; " +
    "SameSite=None; " +
    `Max-Age=${maxAge}`
  );
}


function parseCookies(
  cookieHeader
) {
  const result = {};

  for (
    const part
    of String(cookieHeader).split(";")
  ) {
    const separator =
      part.indexOf("=");

    if (separator < 1) {
      continue;
    }

    const key =
      part.slice(0, separator).trim();

    const value =
      part
        .slice(separator + 1)
        .trim();

    if (!key) {
      continue;
    }

    try {
      result[key] =
        decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }

  return result;
}


/* =========================================================
   REQUEST / INPUT HELPERS
   ========================================================= */

async function readJson(request) {
  try {
    const contentType =
      request.headers.get(
        "Content-Type"
      ) || "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      return null;
    }

    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}


function normalizeString(
  value,
  maxLength
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}


function normalizeColour(value) {
  const colour =
    normalizeString(
      value,
      20
    );

  if (
    /^#[0-9a-fA-F]{6}$/.test(
      colour
    )
  ) {
    return colour.toUpperCase();
  }

  return "#6C63FF";
}


function parseOptionalId(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id < 1
  ) {
    return null;
  }

  return id;
}


async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}


/* =========================================================
   SECURITY / RANDOM HELPERS
   ========================================================= */

function createSecureToken() {
  return bytesToBase64Url(
    crypto.getRandomValues(
      new Uint8Array(32)
    )
  );
}


function constantTimeStringEqual(
  a,
  b
) {
  const encoder =
    new TextEncoder();

  const aBytes =
    encoder.encode(String(a));

  const bBytes =
    encoder.encode(String(b));

  return constantTimeBytesEqual(
    aBytes,
    bBytes
  );
}


function constantTimeBytesEqual(
  a,
  b
) {
  if (
    !(a instanceof Uint8Array) ||
    !(b instanceof Uint8Array)
  ) {
    return false;
  }

  const maxLength =
    Math.max(
      a.length,
      b.length
    );

  let difference =
    a.length ^ b.length;

  for (
    let i = 0;
    i < maxLength;
    i += 1
  ) {
    const aValue =
      i < a.length
        ? a[i]
        : 0;

    const bValue =
      i < b.length
        ? b[i]
        : 0;

    difference |=
      aValue ^ bValue;
  }

  return difference === 0;
}


function delayFailure() {
  return new Promise(
    resolve => {
      setTimeout(
        resolve,
        350
      );
    }
  );
}


/* =========================================================
   ENCODING
   ========================================================= */

function bytesToBase64Url(bytes) {
  let binary = "";

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    const chunk =
      bytes.subarray(
        i,
        i + chunkSize
      );

    binary += String.fromCharCode(
      ...chunk
    );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}


function base64UrlToBytes(value) {
  let base64 = String(value)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (
    base64.length % 4 !== 0
  ) {
    base64 += "=";
  }

  return base64ToBytes(base64);
}


function base64ToBytes(value) {
  const binary =
    atob(String(value));

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i += 1
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}


function bytesToHex(bytes) {
  let output = "";

  for (const byte of bytes) {
    output += byte
      .toString(16)
      .padStart(2, "0");
  }

  return output;
}
