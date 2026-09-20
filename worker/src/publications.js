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

  const content =
    await env.DB
      .prepare(`
        SELECT
          content.id,
          content.project_id,
          content.title,
          content.description,
          content.content_type,
          content.status,

          projects.name
            AS project_name,

          projects.accent_colour

        FROM content

        INNER JOIN projects
          ON projects.id =
             content.project_id

        WHERE content.id = ?
        AND content.user_id = ?

        LIMIT 1
      `)
      .bind(
        contentId,
        session.user.id
      )
      .first();

  if (!content) {
    return json(
      {
        ok: false,
        error: "CONTENT_NOT_FOUND"
      },
      404,
      request
    );
  }

  const accounts =
    await env.DB
      .prepare(`
        SELECT
          social_accounts.id,
          social_accounts.platform,
          social_accounts.account_name,
          social_accounts.account_handle,
          social_accounts.platform_user_id,

          CASE
            WHEN oauth_credentials.id
              IS NOT NULL
            THEN 'connected'
            ELSE 'disconnected'
          END AS connection_status

        FROM social_accounts

        LEFT JOIN oauth_credentials
          ON oauth_credentials.social_account_id =
             social_accounts.id

        WHERE social_accounts.user_id = ?
        AND social_accounts.project_id = ?

        ORDER BY
          social_accounts.platform ASC,
          social_accounts.account_name ASC
      `)
      .bind(
        session.user.id,
        content.project_id
      )
      .all();

  const jobs =
    await env.DB
      .prepare(`
        SELECT
          id,
          social_account_id,
          platform,
          title,
          caption,
          description,
          publish_state,
          scheduled_at,
          published_at,
          external_post_url,
          attempt_count,
          max_attempts,
          last_error,
          created_at,
          updated_at

        FROM publication_jobs

        WHERE user_id = ?
        AND content_id = ?

        ORDER BY created_at DESC
      `)
      .bind(
        session.user.id,
        contentId
      )
      .all();

  return json(
    {
      ok: true,

      content,

      accounts:
        accounts.results || [],

      publications:
        jobs.results || []
    },
    200,
    request
  );
}


/* =========================================================
   CREATE PUBLICATION(S)

   Allows the composer to create multiple platform jobs in
   one request.

   {
     contentId: 12,
     publications: [
       {
         socialAccountId: 3,
         title: "...",
         caption: "...",
         description: "...",
         scheduledAt: "2026-09-21T18:00:00.000Z"
       }
     ]
   }
========================================================= */

export async function createPublications(
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

  const contentId =
    Number(body.contentId);

  if (
    !Number.isInteger(contentId) ||
    contentId < 1
  ) {
    return badRequest(
      request,
      "INVALID_CONTENT"
    );
  }

  if (
    !Array.isArray(
      body.publications
    ) ||
    body.publications.length < 1
  ) {
    return badRequest(
      request,
      "PUBLICATIONS_REQUIRED"
    );
  }

  if (
    body.publications.length > 10
  ) {
    return badRequest(
      request,
      "TOO_MANY_PUBLICATIONS"
    );
  }

  const content =
    await env.DB
      .prepare(`
        SELECT
          id,
          project_id,
          title,
          description,
          status

        FROM content

        WHERE id = ?
        AND user_id = ?

        LIMIT 1
      `)
      .bind(
        contentId,
        auth.session.user.id
      )
      .first();

  if (!content) {
    return json(
      {
        ok: false,
        error: "CONTENT_NOT_FOUND"
      },
      404,
      request
    );
  }

  const prepared = [];

  const usedAccounts =
    new Set();

  for (
    const publication
    of body.publications
  ) {
    if (
      !publication ||
      typeof publication !== "object" ||
      Array.isArray(publication)
    ) {
      return badRequest(
        request,
        "INVALID_PUBLICATION"
      );
    }

    const socialAccountId =
      Number(
        publication.socialAccountId
      );

    if (
      !Number.isInteger(
        socialAccountId
      ) ||
      socialAccountId < 1
    ) {
      return badRequest(
        request,
        "INVALID_SOCIAL_ACCOUNT"
      );
    }

    if (
      usedAccounts.has(
        socialAccountId
      )
    ) {
      return badRequest(
        request,
        "DUPLICATE_SOCIAL_ACCOUNT"
      );
    }

    usedAccounts.add(
      socialAccountId
    );

    const account =
      await env.DB
        .prepare(`
          SELECT
            social_accounts.id,
            social_accounts.platform,
            social_accounts.project_id,

            CASE
              WHEN oauth_credentials.id
                IS NOT NULL
              THEN 1
              ELSE 0
            END AS connected

          FROM social_accounts

          LEFT JOIN oauth_credentials
            ON oauth_credentials.social_account_id =
               social_accounts.id

          WHERE social_accounts.id = ?
          AND social_accounts.user_id = ?

          LIMIT 1
        `)
        .bind(
          socialAccountId,
          auth.session.user.id
        )
        .first();

    if (!account) {
      return badRequest(
        request,
        "SOCIAL_ACCOUNT_NOT_FOUND"
      );
    }

    if (
      Number(
        account.project_id
      ) !==
      Number(
        content.project_id
      )
    ) {
      return badRequest(
        request,
        "ACCOUNT_PROJECT_MISMATCH"
      );
    }

    /*
      We allow disconnected accounts to have DRAFT jobs.

      But a queued job must be connected.
    */

    const scheduledAt =
      normalizeSchedule(
        publication.scheduledAt
      );

    const requestedState =
      normalizeString(
        publication.publishState,
        50
      ).toLowerCase();

    let publishState;

    if (
      requestedState ===
      "draft"
    ) {
      publishState = "draft";
    } else if (scheduledAt) {
      publishState = "queued";
    } else {
      publishState = "ready";
    }

    if (
      publishState === "queued" &&
      !Number(account.connected)
    ) {
      return badRequest(
        request,
        "ACCOUNT_NOT_CONNECTED"
      );
    }

    const title =
      normalizeString(
        publication.title,
        500
      );

    const caption =
      normalizeString(
        publication.caption,
        5000
      );

    const description =
      normalizeString(
        publication.description,
        10000
      );

    if (
      account.platform ===
        "youtube" &&
      !title
    ) {
      return badRequest(
        request,
        "YOUTUBE_TITLE_REQUIRED"
      );
    }

    prepared.push({
      socialAccountId,
      platform:
        account.platform,

      title:
        title ||
        content.title ||
        null,

      caption:
        caption || null,

      description:
        description || null,

      publishState,
      scheduledAt
    });
  }

  const statements = [];

  for (
    const publication
    of prepared
  ) {
    statements.push(
      env.DB
        .prepare(`
          INSERT INTO publication_jobs (
            user_id,
            project_id,
            content_id,
            social_account_id,
            platform,

            title,
            caption,
            description,

            publish_state,
            scheduled_at,

            attempt_count,
            max_attempts,

            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            0, 3,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `)
        .bind(
          auth.session.user.id,
          content.project_id,
          content.id,
          publication.socialAccountId,
          publication.platform,

          publication.title,
          publication.caption,
          publication.description,

          publication.publishState,
          publication.scheduledAt
        )
    );
  }

  await env.DB.batch(
    statements
  );

  /*
    If at least one publication is queued,
    the master content becomes scheduled.

    Otherwise if it was an early pipeline stage,
    it becomes ready.
  */

  const hasQueued =
    prepared.some(
      publication =>
        publication.publishState ===
        "queued"
    );

  if (hasQueued) {
    await env.DB
      .prepare(`
        UPDATE content
        SET
          status = 'scheduled',
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = ?
        AND user_id = ?
      `)
      .bind(
        content.id,
        auth.session.user.id
      )
      .run();
  } else if (
    ![
      "ready",
      "scheduled",
      "published"
    ].includes(
      String(
        content.status
      ).toLowerCase()
    )
  ) {
    await env.DB
      .prepare(`
        UPDATE content
        SET
          status = 'ready',
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = ?
        AND user_id = ?
      `)
      .bind(
        content.id,
        auth.session.user.id
      )
      .run();
  }

  await writeAudit(
    env,
    auth.session.user.id,
    "PUBLICATIONS_CREATED",
    "content",
    String(content.id),
    request
  );

  return json(
    {
      ok: true,
      created:
        prepared.length
    },
    201,
    request
  );
}


/* =========================================================
   UPDATE PUBLICATION
========================================================= */

export async function updatePublication(
  request,
  env,
  publicationId
) {
  const auth =
    await requireMutation(
      request,
      env
    );

  if (auth.error) {
    return auth.error;
  }

  const existing =
    await env.DB
      .prepare(`
        SELECT
          publication_jobs.*,

          CASE
            WHEN oauth_credentials.id
              IS NOT NULL
            THEN 1
            ELSE 0
          END AS connected

        FROM publication_jobs

        LEFT JOIN oauth_credentials
          ON oauth_credentials.social_account_id =
             publication_jobs.social_account_id

        WHERE publication_jobs.id = ?
        AND publication_jobs.user_id = ?

        LIMIT 1
      `)
      .bind(
        publicationId,
        auth.session.user.id
      )
      .first();

  if (!existing) {
    return json(
      {
        ok: false,
        error:
          "PUBLICATION_NOT_FOUND"
      },
      404,
      request
    );
  }

  if (
    !EDITABLE_STATES.has(
      existing.publish_state
    )
  ) {
    return json(
      {
        ok: false,
        error:
          "PUBLICATION_NOT_EDITABLE"
      },
      409,
      request
    );
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
    body.title !== undefined
      ? normalizeString(
          body.title,
          500
        )
      : existing.title;

  const caption =
    body.caption !== undefined
      ? normalizeString(
          body.caption,
          5000
        )
      : existing.caption;

  const description =
    body.description !== undefined
      ? normalizeString(
          body.description,
          10000
        )
      : existing.description;

  let scheduledAt =
    existing.scheduled_at;

  if (
    body.scheduledAt !==
    undefined
  ) {
    scheduledAt =
      normalizeSchedule(
        body.scheduledAt
      );
  }

  let publishState =
    existing.publish_state;

  if (
    body.publishState !==
    undefined
  ) {
    const requested =
      normalizeString(
        body.publishState,
        50
      ).toLowerCase();

    if (
      ![
        "draft",
        "ready",
        "queued"
      ].includes(requested)
    ) {
      return badRequest(
        request,
        "INVALID_PUBLICATION_STATE"
      );
    }

    publishState =
      requested;
  } else {
    if (scheduledAt) {
      publishState =
        "queued";
    } else if (
      publishState ===
      "queued"
    ) {
      publishState =
        "ready";
    }
  }

  if (
    publishState ===
      "queued" &&
    !scheduledAt
  ) {
    return badRequest(
      request,
      "SCHEDULE_REQUIRED"
    );
  }

  if (
    publishState ===
      "queued" &&
    !Number(
      existing.connected
    )
  ) {
    return badRequest(
      request,
      "ACCOUNT_NOT_CONNECTED"
    );
  }

  if (
    existing.platform ===
      "youtube" &&
    !title
  ) {
    return badRequest(
      request,
      "YOUTUBE_TITLE_REQUIRED"
    );
  }

  await env.DB
    .prepare(`
      UPDATE publication_jobs

      SET
        title = ?,
        caption = ?,
        description = ?,
        publish_state = ?,
        scheduled_at = ?,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
      AND user_id = ?
    `)
    .bind(
      title || null,
      caption || null,
      description || null,
      publishState,
      scheduledAt,
      publicationId,
      auth.session.user.id
    )
    .run();

  await writeAudit(
    env,
    auth.session.user.id,
    "PUBLICATION_UPDATED",
    "publication",
    String(publicationId),
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
   CANCEL PUBLICATION

   We do not physically delete publishing history.

   DELETE means cancel for audit/history purposes.
========================================================= */

export async function cancelPublication(
  request,
  env,
  publicationId
) {
  const auth =
    await requireMutation(
      request,
      env
    );

  if (auth.error) {
    return auth.error;
  }

  const existing =
    await env.DB
      .prepare(`
        SELECT
          id,
          publish_state
        FROM publication_jobs
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
      `)
      .bind(
        publicationId,
        auth.session.user.id
      )
      .first();

  if (!existing) {
    return json(
      {
        ok: false,
        error:
          "PUBLICATION_NOT_FOUND"
      },
      404,
      request
    );
  }

  if (
    [
      "processing",
      "published"
    ].includes(
      existing.publish_state
    )
  ) {
    return json(
      {
        ok: false,
        error:
          "PUBLICATION_CANNOT_BE_CANCELLED"
      },
      409,
      request
    );
  }

  await env.DB
    .prepare(`
      UPDATE publication_jobs
      SET
        publish_state =
          'cancelled',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
      AND user_id = ?
    `)
    .bind(
      publicationId,
      auth.session.user.id
    )
    .run();

  await writeAudit(
    env,
    auth.session.user.id,
    "PUBLICATION_CANCELLED",
    "publication",
    String(publicationId),
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
   HELPERS
========================================================= */

function normalizeSchedule(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}
