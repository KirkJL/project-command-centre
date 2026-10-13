import { json, unauthenticated } from "./http.js";
import { requireSession } from "./auth.js";

export async function dashboard(request, env) {
  const session = await requireSession(request, env);
  if (!session) return unauthenticated(request);
  const [projects, content] = await Promise.all([
    env.DB.prepare("SELECT * FROM projects WHERE user_id=? AND status='active' ORDER BY updated_at DESC")
      .bind(session.user.id).all(),
    env.DB.prepare(`SELECT c.*, p.name AS project_name, p.accent_colour
      FROM content c JOIN projects p ON p.id=c.project_id
      WHERE c.user_id=? ORDER BY c.updated_at DESC LIMIT 250`)
      .bind(session.user.id).all()
  ]);
  return json({ok:true, projects:projects.results, recentContent:content.results}, 200, request);
}
