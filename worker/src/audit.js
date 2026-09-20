"use strict";

import {
  hashText
} from "./security.js";

export async function writeAudit(
  env,
  userId,
  action,
  entityType,
  entityId,
  request
) {
  try {
    const ip =
      request.headers.get(
        "CF-Connecting-IP"
      ) || "";

    const ipHash =
      ip
        ? await hashText(ip)
        : null;

    await env.DB
      .prepare(`
        INSERT INTO audit_log (
          user_id,
          action,
          entity_type,
          entity_id,
          ip_hash
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        userId || null,
        String(action).slice(
          0,
          100
        ),
        entityType
          ? String(
              entityType
            ).slice(
              0,
              100
            )
          : null,
        entityId
          ? String(
              entityId
            ).slice(
              0,
              200
            )
          : null,
        ipHash
      )
      .run();
  } catch (error) {
    console.error(
      "Audit write failed:",
      error
    );
  }
}
