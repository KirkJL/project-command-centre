"use strict";

import {
  getOAuthCredential,
  getValidAccessToken
} from "./oauth.js";


export class PublicationError extends Error {
  constructor(
    code,
    {
      retryable = false,
      blocked = false,
      detail = ""
    } = {}
  ) {
    super(code);

    this.name =
      "PublicationError";

    this.code =
      code;

    this.retryable =
      retryable;

    this.blocked =
      blocked;

    this.detail =
      detail;
  }
}


export async function publishJob(
  env,
  job
) {
  if (!job) {
    throw new PublicationError(
      "INVALID_PUBLICATION_JOB"
    );
  }

  if (!job.social_account_id) {
    throw new PublicationError(
      "SOCIAL_ACCOUNT_REQUIRED"
    );
  }

  const credential =
    await getOAuthCredential(
      env,
      job.social_account_id
    );

  if (!credential) {
    throw new PublicationError(
      "ACCOUNT_NOT_CONNECTED"
    );
  }

  /*
   * Validate/refresh OAuth now.
   *
   * This means the queue processor already proves that
   * the connected account is usable before media support
   * is added.
   */
  let accessToken;

  try {
    accessToken =
      await getValidAccessToken(
        env,
        credential
      );
  } catch (error) {
    console.error(
      "Publication OAuth validation failed:",
      job.id,
      error
    );

    throw new PublicationError(
      "ACCOUNT_REAUTH_REQUIRED"
    );
  }

  if (!accessToken) {
    throw new PublicationError(
      "ACCOUNT_REAUTH_REQUIRED"
    );
  }

  /*
   * Build 3F intentionally stops here.
   *
   * We have:
   * - a valid queued publication
   * - an authenticated social account
   * - a usable OAuth access token
   * - a platform adapter boundary
   *
   * What we do NOT yet have is the actual finished
   * video file/media source.
   *
   * Never mark the job published without a real upload.
   */
  throw new PublicationError(
    "MEDIA_REQUIRED",
    {
      blocked: true,
      detail:
        "No media source is attached to this publication yet."
    }
  );
}
