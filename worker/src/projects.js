"use strict";

import {
  PROJECT_TYPES
} from "./config.js";

import {
  json,
  badRequest,
  readJson,
  normalizeString,
  normalizeColour
} from "./http.js";

import {
  requireSession,
  requireMutation
} from "./auth.js";

import {
  writeAudit
} from "./audit.js";

export async function getProjects(
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

  const result =
    await env.DB
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
      .bind(
        session.user.id
      )
      .all();

  return json(
    {
      ok: true,
      projects:
        result.results || []
    },
    200,
    request
  );
}

export async function createProject(
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

  const name =
    normalizeString(
      body.name,
      100
    );

  const description =
    normalizeString(
      body.description,
      2000
    );

  let projectType =
    normalizeString(
      body.projectType,
      50
    ).toLowerCase();

  if (
    !PROJECT_TYPES.has(
      projectType
    )
  ) {
    projectType =
      "custom";
  }

  if (!name) {
    return badRequest(
      request,
      "PROJECT_NAME_REQUIRED"
    );
  }

  const slug =
    await createUniqueProjectSlug(
      env,
      session.user.id,
      name
    );

  const result =
    await env.DB
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
        normalizeColour(
          body.accentColour
        )
      )
      .run();

  await writeAudit(
    env,
    session.user.id,
    "PROJECT_CREATED",
    "project",
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

export async function assertOwnedProject(
  env,
  userId,
  projectId
) {
  if (
    !Number.isInteger(
      projectId
    ) ||
    projectId < 1
  ) {
    throw new Error(
      "INVALID_PROJECT"
    );
  }

  const project =
    await env.DB
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

function createSlug(value) {
  return (
    String(value || "")
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(0, 80) ||
    "project"
  );
}

async function createUniqueProjectSlug(
  env,
  userId,
  name
) {
  const base =
    createSlug(name);

  let candidate = base;
  let counter = 2;

  while (
    counter <= 1000
  ) {
    const existing =
      await env.DB
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

  return (
    `${base}-` +
    crypto.randomUUID()
      .slice(0, 8)
  );
}
