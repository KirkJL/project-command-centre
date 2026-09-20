"use strict";

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

export async function getIdeas(
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
          ideas.id,
          ideas.project_id,
          ideas.title,
          ideas.description,
          ideas.idea_type,
          ideas.status,
          ideas.created_at,
          ideas.updated_at,
          projects.name
            AS project_name
        FROM ideas
        LEFT JOIN projects
          ON projects.id =
             ideas.project_id
        WHERE ideas.user_id = ?
        ORDER BY
          ideas.updated_at DESC
        LIMIT 250
      `)
      .bind(
        session.user.id
      )
      .all();

  return json(
    {
      ok: true,
      ideas:
        result.results || []
    },
    200,
    request
  );
}

export async function createIdea(
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

  const ideaType =
    normalizeString(
      body.ideaType,
      100
    );

  const projectId =
    parseOptionalId(
      body.projectId
    );

  if (!title) {
    return badRequest(
      request,
      "IDEA_TITLE_REQUIRED"
    );
  }

  if (projectId) {
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
  }

  const result =
    await env.DB
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
        auth.session.user.id,
        projectId || null,
        title,
        description || null,
        ideaType || null
      )
      .run();

  await writeAudit(
    env,
    auth.session.user.id,
    "IDEA_CREATED",
    "idea",
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
