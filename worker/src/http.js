"use strict";

import {
  ALLOWED_ORIGINS
} from "./config.js";

export function json(
  data,
  status,
  request,
  extraHeaders = {}
) {
  const headers =
    securityHeaders(request);

  headers.set(
    "Content-Type",
    "application/json; charset=UTF-8"
  );

  headers.set(
    "Cache-Control",
    "no-store"
  );

  for (
    const [key, value]
    of Object.entries(extraHeaders)
  ) {
    headers.set(key, value);
  }

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers
    }
  );
}

export function badRequest(
  request,
  error
) {
  return json(
    {
      ok: false,
      error
    },
    400,
    request
  );
}

export function unauthenticated(
  request
) {
  return json(
    {
      ok: false,
      error: "UNAUTHENTICATED"
    },
    401,
    request
  );
}

export function csrfFailure(
  request
) {
  return json(
    {
      ok: false,
      error: "INVALID_CSRF_TOKEN"
    },
    403,
    request
  );
}

export function handleOptions(
  request
) {
  const origin =
    request.headers.get("Origin");

  if (
    !origin ||
    !ALLOWED_ORIGINS.has(origin)
  ) {
    return new Response(null, {
      status: 403,
      headers:
        securityHeaders(request)
    });
  }

  const headers =
    securityHeaders(request);

  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-CSRF-Token"
  );

  headers.set(
    "Access-Control-Max-Age",
    "86400"
  );

  return new Response(null, {
    status: 204,
    headers
  });
}

export function securityHeaders(
  request
) {
  const headers =
    new Headers();

  const origin =
    request.headers.get("Origin");

  if (
    origin &&
    ALLOWED_ORIGINS.has(origin)
  ) {
    headers.set(
      "Access-Control-Allow-Origin",
      origin
    );

    headers.set(
      "Access-Control-Allow-Credentials",
      "true"
    );

    headers.set(
      "Vary",
      "Origin"
    );
  }

  headers.set(
    "X-Content-Type-Options",
    "nosniff"
  );

  headers.set(
    "X-Frame-Options",
    "DENY"
  );

  headers.set(
    "Referrer-Policy",
    "no-referrer"
  );

  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  headers.set(
    "Cross-Origin-Resource-Policy",
    "cross-origin"
  );

  return headers;
}

export async function readJson(
  request
) {
  try {
    const contentType =
      request.headers.get(
        "Content-Type"
      ) || "";

    if (
      !contentType
        .toLowerCase()
        .includes("application/json")
    ) {
      return null;
    }

    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}

export function normalizeString(
  value,
  maxLength
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

export function normalizeColour(
  value
) {
  const colour =
    normalizeString(
      value,
      20
    );

  if (
    /^#[0-9a-fA-F]{6}$/.test(
      colour
    )
  ) {
    return colour.toUpperCase();
  }

  return "#6C63FF";
}

export function parseOptionalId(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id < 1
  ) {
    return null;
  }

  return id;
}

export async function safeJson(
  response
) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
