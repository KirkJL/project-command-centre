"use strict";

import {
  publishJob,
  PublicationError
} from "./publishers.js";


const BATCH_SIZE = 10;

const PROCESSING_TIMEOUT_MINUTES =
  20;

const RETRY_DELAYS_MINUTES = [
  5,
  15,
  60
];


export async function processPublicationQueue(
  env
) {
  const summary = {
    examined: 0,
    claimed: 0,
    published: 0,
    retrying: 0,
    failed: 0,
    blocked: 0,
    recovered: 0
  };

  /*
   * Recover jobs abandoned by a terminated Worker.
   */
  summary.recovered =
    await recoverStaleJobs(env);

  const due =
    await env.DB
      .prepare(`
        SELECT id

        FROM publication_jobs

        WHERE
        (
          publish_state = 'queued'

          AND scheduled_at IS NOT NULL

          AND datetime(scheduled_at)
            <= datetime('now')
        )

        OR
        (
          publish_state = 'retrying'

          AND next_attempt_at IS NOT NULL

          AND datetime(next_attempt_at)
            <= datetime('now')
        )

        ORDER BY

          CASE publish_state
            WHEN 'retrying' THEN 1
            WHEN 'queued' THEN 2
            ELSE 3
          END,

          COALESCE(
            next_attempt_at,
            scheduled_at
          ) ASC,

          id ASC

        LIMIT ?
      `)
      .bind(
        BATCH_SIZE
      )
      .all();

  const rows =
    due.results || [];

  summary.examined =
    rows.length;

  for (const row of rows) {
    const claimed =
      await claimJob(
        env,
        row.id
      );

    if (!claimed) {
      continue;
    }

    summary.claimed += 1;

    try {
      const result =
        await publishJob(
          env,
          claimed
        );

      await markPublished(
        env,
        claimed.id,
        result
      );

      summary.published += 1;
    } catch (error) {
      if (
        error instanceof
          PublicationError &&
        error.blocked
      ) {
        await markBlocked(
          env,
          claimed.id,
          error
        );

        summary.blocked += 1;

        continue;
      }

      const result =
        await handleFailure(
          env,
          claimed,
          error
        );

      if (
        result ===
        "retrying"
      ) {
        summary.retrying += 1;
      } else {
        summary.failed += 1;
      }
    }
  }

  console.log(
    "Publication queue processed:",
    JSON.stringify(summary)
  );

  return summary;
}


async function claimJob(
  env,
  publicationId
) {
  /*
   * D1 does not give us SELECT ... FOR UPDATE.
   *
   * Instead we perform a conditional UPDATE and only
   * continue if this invocation actually changed the row.
   */
  const result =
    await env.DB
      .prepare(`
        UPDATE publication_jobs

        SET
          publish_state =
            'processing',

          processing_started_at =
            CURRENT_TIMESTAMP,

          attempt_count =
            attempt_count + 1,

          last_error =
            NULL,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = ?

        AND
        (
          (
            publish_state =
              'queued'

            AND scheduled_at
              IS NOT NULL

            AND datetime(
              scheduled_at
            ) <= datetime('now')
          )

          OR

          (
            publish_state =
              'retrying'

            AND next_attempt_at
              IS NOT NULL

            AND datetime(
              next_attempt_at
            ) <= datetime('now')
          )
        )
      `)
      .bind(
        publicationId
      )
      .run();

  if (
    !result.meta ||
    Number(
      result.meta.changes || 0
    ) !== 1
  ) {
    return null;
  }

  return env.DB
    .prepare(`
      SELECT
        publication_jobs.*,

        social_accounts.account_name,
        social_accounts.account_handle,
        social_accounts.platform_user_id,
        social_accounts.brand_group_id AS account_brand_group_id,

        content.title
          AS content_title,
        content.brand_group_id AS content_brand_group_id,

        content.description
          AS content_description

      FROM publication_jobs

      INNER JOIN social_accounts
        ON social_accounts.id =
           publication_jobs.social_account_id

      INNER JOIN content
        ON content.id =
           publication_jobs.content_id

      WHERE publication_jobs.id = ?

      LIMIT 1
    `)
    .bind(
      publicationId
    )
    .first();
}


async function markPublished(
  env,
  publicationId,
  result = {}
) {
  await env.DB
    .prepare(`
      UPDATE publication_jobs

      SET
        publish_state =
          'published',

        published_at =
          CURRENT_TIMESTAMP,

        external_post_id = ?,
        external_post_url = ?,

        processing_started_at =
          NULL,

        next_attempt_at =
          NULL,

        last_error =
          NULL,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
      AND publish_state =
        'processing'
    `)
    .bind(
      result.externalPostId ||
        null,

      result.externalPostUrl ||
        null,

      publicationId
    )
    .run();

  /*
   * If every non-cancelled publication belonging to the
   * content has now published, move the master content
   * into Published.
   */
  const job =
    await env.DB
      .prepare(`
        SELECT
          user_id,
          content_id

        FROM publication_jobs

        WHERE id = ?

        LIMIT 1
      `)
      .bind(
        publicationId
      )
      .first();

  if (!job) {
    return;
  }

  const remaining =
    await env.DB
      .prepare(`
        SELECT COUNT(*) AS count

        FROM publication_jobs

        WHERE user_id = ?
        AND content_id = ?

        AND publish_state NOT IN (
          'published',
          'cancelled'
        )
      `)
      .bind(
        job.user_id,
        job.content_id
      )
      .first();

  if (
    Number(
      remaining?.count || 0
    ) === 0
  ) {
    await env.DB
      .prepare(`
        UPDATE content

        SET
          status =
            'published',

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
        AND user_id = ?
      `)
      .bind(
        job.content_id,
        job.user_id
      )
      .run();
  }
}


async function markBlocked(
  env,
  publicationId,
  error
) {
  /*
   * MEDIA_REQUIRED isn't a platform failure.
   *
   * Return it to READY instead of burning through retries.
   * Once media is attached in 3G, it can be queued again.
   */
  await env.DB
    .prepare(`
      UPDATE publication_jobs

      SET
        publish_state =
          'ready',

        processing_started_at =
          NULL,

        next_attempt_at =
          NULL,

        last_error = ?,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
      AND publish_state =
        'processing'
    `)
    .bind(
      cleanError(error),
      publicationId
    )
    .run();
}


async function handleFailure(
  env,
  job,
  error
) {
  const attemptCount =
    Number(
      job.attempt_count || 0
    );

  const maxAttempts =
    Math.max(
      1,
      Number(
        job.max_attempts || 3
      )
    );

  const retryable =
    error instanceof
      PublicationError
      ? error.retryable
      : true;

  const canRetry =
    retryable &&
    attemptCount <
      maxAttempts;

  if (!canRetry) {
    await env.DB
      .prepare(`
        UPDATE publication_jobs

        SET
          publish_state =
            'failed',

          processing_started_at =
            NULL,

          next_attempt_at =
            NULL,

          last_error = ?,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
        AND publish_state =
          'processing'
      `)
      .bind(
        cleanError(error),
        job.id
      )
      .run();

    return "failed";
  }

  const delayMinutes =
    RETRY_DELAYS_MINUTES[
      Math.min(
        Math.max(
          attemptCount - 1,
          0
        ),
        RETRY_DELAYS_MINUTES.length -
          1
      )
    ];

  const nextAttemptAt =
    new Date(
      Date.now() +
      delayMinutes *
        60 *
        1000
    ).toISOString();

  await env.DB
    .prepare(`
      UPDATE publication_jobs

      SET
        publish_state =
          'retrying',

        processing_started_at =
          NULL,

        next_attempt_at = ?,

        last_error = ?,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
      AND publish_state =
        'processing'
    `)
    .bind(
      nextAttemptAt,
      cleanError(error),
      job.id
    )
    .run();

  return "retrying";
}


async function recoverStaleJobs(
  env
) {
  const result =
    await env.DB
      .prepare(`
        UPDATE publication_jobs

        SET
          publish_state =
            CASE
              WHEN attempt_count
                >= max_attempts
              THEN 'failed'
              ELSE 'retrying'
            END,

          next_attempt_at =
            CASE
              WHEN attempt_count
                >= max_attempts
              THEN NULL
              ELSE CURRENT_TIMESTAMP
            END,

          processing_started_at =
            NULL,

          last_error =
            CASE
              WHEN attempt_count
                >= max_attempts
              THEN 'PROCESSING_TIMEOUT'
              ELSE 'PROCESSING_TIMEOUT_RETRY'
            END,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE publish_state =
          'processing'
        AND NOT EXISTS (
          SELECT 1 FROM media_uploads m
          WHERE m.publication_job_id=publication_jobs.id
          AND m.upload_state='processing'
        )
        AND NOT EXISTS (
          SELECT 1 FROM youtube_uploads y
          WHERE y.publication_job_id=publication_jobs.id
          AND y.upload_state IN ('ready','sending','uploading','processing')
        )

        AND processing_started_at
          IS NOT NULL

        AND datetime(
          processing_started_at
        ) <= datetime(
          'now',
          ?
        )
      `)
      .bind(
        `-${PROCESSING_TIMEOUT_MINUTES} minutes`
      )
      .run();

  return Number(
    result.meta?.changes || 0
  );
}


function cleanError(
  error
) {
  if (
    error instanceof
      PublicationError
  ) {
    const detail =
      error.detail
        ? `: ${error.detail}`
        : "";

    return (
      `${error.code}${detail}`
    ).slice(
      0,
      1000
    );
  }

  if (
    error instanceof Error
  ) {
    return (
      error.message ||
      "PUBLICATION_FAILED"
    ).slice(
      0,
      1000
    );
  }

  return String(
    error ||
    "PUBLICATION_FAILED"
  ).slice(
    0,
    1000
  );
}
