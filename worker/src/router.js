import { ALLOWED_ORIGINS } from "./config.js";
import { json, handleOptions } from "./http.js";
import { register } from "./registration.js";
import { login, logout, me } from "./auth.js";
import { dashboard } from "./dashboard.js";
import { getProjects, createProject } from "./projects.js";
import { getContent, createContent, updateContentStatus } from "./content.js";
import { getIdeas, createIdea } from "./ideas.js";
import { getAccounts, createAccount, disconnectSocialAccount } from "./accounts.js";
import { getCalendar } from "./calendar.js";
import { getPublications, getPublishingData, createPublications, updatePublication, cancelPublication } from "./publications.js";
import { startTikTokOAuth, finishTikTokOAuth, getTikTokCreatorInfo } from "./tiktok.js";
import { startYouTubeOAuth, finishYouTubeOAuth } from "./youtube.js";
import { initialiseTikTokUpload, completeTikTokUpload, getMediaUploads } from "./media.js";
import { getTikTokPublishStatus } from "./tiktokstatus.js";
import { initYouTubeUpload, sendYouTubeChunk, youtubeUploadStatus } from "./youtubeUpload.js";
import { tasks, library, planner, analytics } from "./workspace.js";
import { recurringTasks } from "./recurring.js";
import { brandGroups, assignBrand } from "./brands.js";
import { libraryDetail } from "./libraryDetail.js";
import { githubRepos, githubIssues } from "./github.js";
import { notifications, assistantContext, integrationStatus } from "./foundations.js";
import { getAuditLog, changePassword } from "./settings.js";

// Each route explicitly lists its allowed methods. Handlers enforce ownership and CSRF.
const routes = [
  ["/api/health", {GET: r => json({ok:true},200,r)}],
  ["/api/auth/login", {POST:login}],
  ["/api/auth/register", {POST:register}],
  ["/api/auth/logout", {POST:logout}],
  ["/api/auth/me", {GET:me}],
  ["/api/dashboard", {GET:dashboard}],
  ["/api/projects", {GET:getProjects,POST:createProject}],
  ["/api/content", {GET:getContent,POST:createContent}],
  [/^\/api\/content\/(\d+)\/status$/, {PATCH:updateContentStatus}],
  [/^\/api\/content\/(\d+)\/publishing$/, {GET:getPublishingData}],
  ["/api/ideas", {GET:getIdeas,POST:createIdea}],
  ["/api/accounts", {GET:getAccounts,POST:createAccount}],
  [/^\/api\/accounts\/(\d+)\/disconnect$/, {POST:disconnectSocialAccount}],
  [/^\/api\/accounts\/(\d+)\/creator-info$/, {GET:getTikTokCreatorInfo}],
  ["/api/calendar", {GET:getCalendar}],
  ["/api/publications", {GET:getPublications,POST:createPublications}],
  [/^\/api\/publications\/(\d+)$/, {PATCH:updatePublication,DELETE:cancelPublication}],
  ["/api/oauth/tiktok/start", {POST:startTikTokOAuth}],
  ["/api/oauth/tiktok/callback", {GET:finishTikTokOAuth}],
  ["/api/oauth/youtube/start", {POST:startYouTubeOAuth}],
  ["/api/oauth/youtube/callback", {GET:finishYouTubeOAuth}],
  ["/api/media", {GET:getMediaUploads}],
  ["/api/media/tiktok/init", {POST:initialiseTikTokUpload}],
  [/^\/api\/media\/tiktok\/(\d+)\/complete$/, {POST:completeTikTokUpload}],
  [/^\/api\/media\/tiktok\/(\d+)\/status$/, {GET:getTikTokPublishStatus}],
  ["/api/media/youtube/init", {POST:initYouTubeUpload}],
  [/^\/api\/media\/youtube\/(\d+)\/chunk$/, {PUT:sendYouTubeChunk}],
  [/^\/api\/media\/youtube\/(\d+)\/status$/, {GET:youtubeUploadStatus}],
  ["/api/tasks", {GET:tasks,POST:tasks}],
  [/^\/api\/tasks\/(\d+)$/, {PATCH:tasks}],
  ["/api/recurring-tasks", {GET:recurringTasks,POST:recurringTasks}],
  [/^\/api\/recurring-tasks\/(\d+)$/, {PATCH:recurringTasks}],
  ["/api/library", {GET:library}],
  [/^\/api\/library\/(\d+)$/, {GET:libraryDetail,POST:libraryDetail}],
  ["/api/planner", {GET:planner}],
  ["/api/analytics", {GET:analytics}],
  ["/api/brands", {GET:brandGroups,POST:brandGroups}],
  [/^\/api\/accounts\/(\d+)\/brand$/, {PATCH:(r,e,id)=>assignBrand(r,e,"account",id)}],
  [/^\/api\/content\/(\d+)\/brand$/, {PATCH:(r,e,id)=>assignBrand(r,e,"content",id)}],
  ["/api/github/repos", {GET:githubRepos,POST:githubRepos}],
  [/^\/api\/github\/repos\/(\d+)\/issues$/, {GET:githubIssues}],
  ["/api/notifications", {GET:notifications}],
  ["/api/assistant/context", {GET:assistantContext}],
  ["/api/integrations", {GET:integrationStatus}],
  ["/api/settings/audit", {GET:getAuditLog}],
  ["/api/settings/password", {POST:changePassword}]
];

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return handleOptions(request);
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin) && origin !== url.origin) {
    return json({ok:false,error:"ORIGIN_NOT_ALLOWED"},403,request);
  }
  for (const [pattern, methods] of routes) {
    const match = typeof pattern === "string" ? (url.pathname === pattern ? [] : null) : url.pathname.match(pattern);
    if (!match) continue;
    const handler = methods[request.method];
    if (!handler) return json({ok:false,error:"METHOD_NOT_ALLOWED"},405,request,{Allow:Object.keys(methods).join(", ")});
    const id = match[1] === undefined ? undefined : Number(match[1]);
    if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) return json({ok:false,error:"INVALID_ID"},400,request);
    return handler(request,env,id);
  }
  return json({ok:false,error:"NOT_FOUND"},404,request);
}
