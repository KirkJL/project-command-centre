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
  writeAudit
} from "./audit.js";


const PUBLICATION_STATES = new Set([
  "draft",
  "ready",
  "queued",
  "processing",
  "retrying",
  "published",
  "failed",
  "cancelled"
]);


const EDITABLE_STATES = new Set([
  "draft",
  "ready",
  "queued"
]);


/* =========================================================
   GET PUBLICATIONS
========================================================= */

export async function getPublications(
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

  const url =
    new URL(request.url);

  const projectId =
    parseOptionalId(
      url.searchParams.get(
        "projectId"
      )
    );

  const contentId =
    parseOptionalId(
      url.searchParams.get(
        "contentId"
      )
    );

  const state =
    normalizeString(
      url.searchParams.get(
        "state"
      ),
      50
    ).toLowerCase();

  let query = `
    SELECT
      publication_jobs.id,
      publication_jobs.project_id,
      publication_jobs.content_id,
      publication_jobs.social_account_id,
      publication_jobs.platform,

      publication_jobs.title,
      publication_jobs.caption,
      publication_jobs.description,

      publication_jobs.publish_state,

      publication_jobs.scheduled_at,
      publication_jobs.processing_started_at,
      publication_jobs.published_at,

      publication_jobs.external_post_id,
      publication_jobs.external_post_url,

      publication_jobs.attempt_count,
      publication_jobs.max_attempts,
      publication_jobs.last_error,

      publication_jobs.created_at,
      publication_jobs.updated_at,

      content.title
        AS content_title,

      content.content_type,

      projects.name
        AS project_name,

      projects.accent_colour,

      social_accounts.account_name,
      social_accounts.account_handle

    FROM publication_jobs

    INNER JOIN content
      ON content.id =
         publication_jobs.content_id

    INNER JOIN projects
      ON projects.id =
         publication_jobs.project_id

    INNER JOIN social_accounts
      ON social_accounts.id =
         publication_jobs.social_account_id

    WHERE publication_jobs.user_id = ?
  `;

  const bindings = [
    session.user.id
  ];

  if (projectId) {
    query += `
      AND publication_jobs.project_id = ?
    `;

    bindings.push(projectId);
  }

  if (contentId) {
    query += `
      AND publication_jobs.content_id = ?
    `;

    bindings.push(contentId);
  }

  if (
    state &&
    PUBLICATION_STATES.has(state)
  ) {
    query += `
      AND publication_jobs.publish_state = ?
    `;

    bindings.push(state);
  }

  query += `
    ORDER BY

      CASE publication_jobs.publish_state

        WHEN 'processing'
          THEN 1

        WHEN 'retrying'
          THEN 2

        WHEN 'queued'
          THEN 3

        WHEN 'ready'
          THEN 4

        WHEN 'draft'
          THEN 5

        WHEN 'failed'
          THEN 6

        WHEN 'published'
          THEN 7

        WHEN 'cancelled'
          THEN 8

        ELSE 9

      END,

      CASE
        WHEN publication_jobs.scheduled_at
          IS NULL
        THEN 1
        ELSE 0
      END,

      publication_jobs.scheduled_at ASC,

      publication_jobs.created_at DESC

    LIMIT 500
  `;

  const result =
    await env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

  return json(
    {
      ok: true,
      publications:
        result.results || []
    },
    200,
    request
  );
}


/* =========================================================
   GET CONTENT PUBLISHING DATA

   Used by the frontend composer.

   Returns:
   - content
   - project
   - social accounts belonging to project
   - existing publication jobs
========================================================= */

export async function getPublishingData(
  request,
  env,
  contentId
) {
  const session =
    await requireSession(
      request,
      env
    );

  if (!session
