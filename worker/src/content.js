"use strict";

import {
  CONTENT_TYPES,
  CONTENT_STATUSES
} from "./config.js";

import {
  json,
  badRequest,
  readJson,
  normalizeString,
  parseOptionalId
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

export async function getContent(
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
        error:
          "UNAUTHENTICATED"
      },
      401,
      request
    );
  }

  const url =
    new URL(request.url);

  const projectId =
    parseOptionalId(
      url.searchParams.get(
        "projectId"
      )
    );

  const status =
    normalizeString(
      url.searchParams.get(
        "status"
      ),
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
      projects.name
        AS project_name,
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

    bindings.push(
      projectId
    );
  }

  if (
    status &&
    CONTENT_STATUSES.has(
      status
    )
  ) {
    query += `
      AND content.status = ?
    `;

    bindings.push(status);
  }

  query += `
    ORDER BY
      content.updated_at DESC
    LIMIT 250
  `;

  const result =
    await env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

  return json(
    {
      ok: true,
      content:
        result.results || []
    },
    200,
    request
  );
}

export async function createContent(
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

  const session =
    auth.session;

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

  const title =
    normalizeString(
      body.title,
      200
    );

  const description =
    normalizeString(
      body.description,
      5000
    );

  const contentType =
    normalizeString(
      body.contentType,
      50
    ).toLowerCase();

  const status =
    normalizeString(
      body.status,
      50
    ).toLowerCase();

  if (!title) {
    return badRequest(
      request,
      "CONTENT_TITLE_REQUIRED"
    );
  }

  if (
    !CONTENT_TYPES.has(
      contentType
    )
  ) {
    return badRequest(
      request,
      "INVALID_CONTENT_TYPE"
    );
  }

  if (
    !CONTENT_STATUSES.has(
      status
    )
  ) {
    return badRequest(
      request,
      "INVALID_CONTENT_STATUS"
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

  const result =
    await env.DB
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

export async function updateContentStatus(
  request,
  env,
  contentId
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

  const status =
    normalizeString(
      body.status,
      50
    ).toLowerCase();

  if (
    !CONTENT_STATUSES.has(
      status
    )
  ) {
    return badRequest(
      request,
      "INVALID_CONTENT_STATUS"
    );
  }

  const result =
    await env.DB
      .prepare(`
        UPDATE content
        SET
          status = ?,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = ?
        AND user_id = ?
      `)
      .bind(
        status,
        contentId,
        auth.session.user.id
      )
      .run();

  if (!result.meta.changes) {
    return json(
      {
        ok: false,
        error:
          "CONTENT_NOT_FOUND"
      },
      404,
      request
    );
  }

  await writeAudit(
    env,
    auth.session.user.id,
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
