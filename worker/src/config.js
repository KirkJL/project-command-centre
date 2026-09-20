"use strict";

export const ALLOWED_ORIGINS =
  new Set([
    "https://kirkjl.github.io"
  ]);

export const FRONTEND_URL =
  "https://kirkjl.github.io/project-command-centre/";

export const TIKTOK_REDIRECT_URI =
  "https://project-hub-api.kirkjlemon.workers.dev/api/oauth/tiktok/callback";

export const YOUTUBE_REDIRECT_URI =
  "https://project-hub-api.kirkjlemon.workers.dev/api/oauth/youtube/callback";

export const SESSION_COOKIE =
  "project_hub_session";

export const SESSION_LENGTH_SECONDS =
  60 * 60 * 24 * 7;

export const PROJECT_TYPES =
  new Set([
    "content",
    "software",
    "game",
    "brand",
    "website",
    "custom"
  ]);

export const CONTENT_TYPES =
  new Set([
    "video",
    "image",
    "carousel",
    "text"
  ]);

export const CONTENT_STATUSES =
  new Set([
    "idea",
    "script",
    "recording",
    "editing",
    "ready",
    "scheduled",
    "published",
    "archived"
  ]);

export const SOCIAL_PLATFORMS =
  new Set([
    "tiktok",
    "youtube",
    "instagram"
  ]);
