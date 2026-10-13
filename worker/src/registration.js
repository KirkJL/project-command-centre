import { json, badRequest, readJson } from "./http.js";
import { hashPassword, hashText } from "./security.js";

export async function register(request, env) {
  if (env.ALLOW_REGISTRATION !== "true") {
    return json({ok:false,error:"REGISTRATION_CLOSED"},403,request);
  }
  const body = await readJson(request);
  if (!body) return badRequest(request,"INVALID_JSON");
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(username)) return badRequest(request,"USERNAME_REQUIRES_3_TO_40_LETTERS_NUMBERS");
  if (!displayName || displayName.length > 100) return badRequest(request,"DISPLAY_NAME_REQUIRED");
  if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 200) {
    return badRequest(request,"PASSWORD_REQUIRES_12_TO_200_CHARACTERS");
  }
  // Atomic IP quota also bounds expensive password hashing and concurrent signups.
  const key = "registration:" + await hashText(request.headers.get("CF-Connecting-IP") || "unknown");
  const quota = await env.DB.prepare(`INSERT INTO login_limits(key,attempts,window_started_at)
    VALUES (?,1,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET
    attempts=CASE WHEN datetime(window_started_at)<=datetime('now','-1 hour') THEN 1 ELSE attempts+1 END,
    window_started_at=CASE WHEN datetime(window_started_at)<=datetime('now','-1 hour') THEN CURRENT_TIMESTAMP ELSE window_started_at END
    RETURNING attempts`).bind(key).first();
  if (quota.attempts > 5) return json({ok:false,error:"TOO_MANY_ACCOUNT_REQUESTS"},429,request);
  const hash = await hashPassword(body.password);
  const result = await env.DB.prepare(`INSERT INTO users(username,display_name,password_hash)
    VALUES (?,?,?) ON CONFLICT(username) DO NOTHING`).bind(username,displayName,hash).run();
  if (!result.meta.changes) return json({ok:false,error:"USERNAME_UNAVAILABLE"},409,request);
  return json({ok:true},201,request);
}
