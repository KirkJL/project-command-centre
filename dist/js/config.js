"use strict";

/**
 * PUBLIC CONFIGURATION ONLY.
 *
 * This file is publicly visible on GitHub.
 *
 * NEVER PUT:
 * API keys
 * OAuth secrets
 * passwords
 * access tokens
 * refresh tokens
 * encryption keys
 *
 * IN THIS FILE.
 */

window.APP_CONFIG = Object.freeze({
  API_BASE_URL:
    window.location.hostname !== "kirkjl.github.io"
      ? window.location.origin
      : "https://project-hub-api.kirkjlemon.workers.dev"
});
