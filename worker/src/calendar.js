"use strict";

import {
  json
} from "./http.js";

import {
  requireSession
} from "./auth.js";

export async function getCalendar(
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
          publications.id,
          publications.platform,
          publications.title,
          publications.caption,
          publications.publish_state,
          publications.scheduled_at,
          publications.published_at,

          content.id
            AS content_id,

          content.title
            AS content_title,

          projects.id
            AS project_id,

          projects.name
            AS project_name,

          social_accounts.id
            AS social_account_id,

          social_accounts.account_name

        FROM publication_jobs AS publications

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
          (publications.publish_state IN ('queued','retrying','processing')
            AND publications.scheduled_at IS NOT NULL)
          OR (publications.publish_state='published'
            AND publications.published_at IS NOT NULL)
        )

        ORDER BY
          COALESCE(
            publications.scheduled_at,
            publications.published_at
          ) ASC

        LIMIT 250
      `)
      .bind(
        session.user.id
      )
      .all();

  return json(
    {
      ok: true,
      events:
        result.results || []
    },
    200,
    request
  );
}
