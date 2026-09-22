"use strict";

import {tasks,library,planner,analytics} from "./workspace.js";
import {initYouTubeUpload,sendYouTubeChunk,youtubeUploadStatus} from "./youtubeUpload.js";
import {getAuditLog,changePassword} from "./settings.js";
import {recurringTasks} from "./recurring.js";
import {brandGroups,assignBrand} from "./brands.js";
import {notifications,assistantContext,integrationStatus} from "./foundations.js";
import {githubRepos,githubIssues} from "./github.js";
import {libraryDetail} from "./libraryDetail.js";

import {
  ALLOWED_ORIGINS
} from "./config.js";

import {
  json,
  handleOptions
} from "./http.js";

import {
  login,
  logout,
  me,
  requireSession
} from "./auth.js";

import {
  getProjects,
  createProject
} from "./projects.js";

import {
  getContent,
  createContent,
  updateContentStatus
} from "./content.js";

import {
  getIdeas,
  createIdea
} from "./ideas.js";

import {
  getAccounts,
  createAccount,
  disconnectSocialAccount
} from "./accounts.js";

import {
  getCalendar
} from "./calendar.js";

import {
  startTikTokOAuth,
  finishTikTokOAuth,
  getTikTokCreatorInfo
} from "./tiktok.js";

import {
  startYouTubeOAuth,
  finishYouTubeOAuth
} from "./youtube.js";

import {
  getPublications,
  getPublishingData,
  createPublications,
  updatePublication,
  cancelPublication
} from "./publications.js";

import {
  initialiseTikTokUpload,
  completeTikTokUpload,
  getMediaUploads
} from "./media.js";

import {
  getTikTokPublishStatus
} from "./tiktokstatus.js";


export async function handleRequest(
  request,
  env,
  ctx
) {
  void ctx;

  const url =
    new URL(request.url);

  const origin =
    request.headers.get(
      "Origin"
    );

  if (
    origin &&
    !ALLOWED_ORIGINS.has(origin)
  ) {
    return json(
      {
        ok: false,
        error: "ORIGIN_NOT_ALLOWED"
      },
      403,
      request
    );
  }

  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }


  /* =======================================================
     HEALTH
  ======================================================= */

  if (
    url.pathname === "/" &&
    request.method === "GET"
  ) {
    return json(
      {
        ok: true,
        service: "Project Hub API",
        version: "1.0-candidate"
      },
      200,
      request
    );
  }

  if (
    url.pathname === "/api/health" &&
    request.method === "GET"
  ) {
    return json(
      {
        ok: true,
        status: "healthy",
        version: "1.0-candidate"
      },
      200,
      request
    );
  }


  /* =======================================================
     AUTH
  ======================================================= */

  if (
    url.pathname === "/api/auth/login" &&
    request.method === "POST"
  ) {
    return login(
      request,
      env
    );
  }

  if (
    url.pathname === "/api/auth/logout" &&
    request.method === "POST"
  ) {
    return logout(
      request,
      env
    );
  }

  if (
    url.pathname === "/api/auth/me" &&
    request.method === "GET"
  ) {
    return me(
      request,
      env
    );
  }


  /* =======================================================
     DASHBOARD
  ======================================================= */

  if (
    url.pathname === "/api/dashboard" &&
    request.method === "GET"
  ) {
    return dashboard(
      request,
      env
    );
  }


  /* =======================================================
     PROJECTS
  ======================================================= */

  if (
    url.pathname === "/api/projects"
  ) {
    if (request.method === "GET") {
      return getProjects(
        request,
        env
      );
    }

    if (request.method === "POST") {
      return createProject(
        request,
        env
      );
    }
  }


  /* =======================================================
     CONTENT
  ======================================================= */

  if (
    url.pathname === "/api/content"
  ) {
    if (request.method === "GET") {
      return getContent(
        request,
        env
      );
    }

    if (request.method === "POST") {
      return createContent(
        request,
        env
      );
    }
  }

  const contentStatusMatch =
    url.pathname.match(
      /^\/api\/content\/(\d+)\/status$/
    );

  if (
    contentStatusMatch &&
    request.method === "PATCH"
  ) {
    return updateContentStatus(
      request,
      env,
      Number(contentStatusMatch[1])
    );
  }

  const publishingDataMatch =
    url.pathname.match(
      /^\/api\/content\/(\d+)\/publishing$/
    );

  if (
    publishingDataMatch &&
    request.method === "GET"
  ) {
    return getPublishingData(
      request,
      env,
      Number(
        publishingDataMatch[1]
      )
    );
  }


  /* =======================================================
     PUBLICATIONS
  ======================================================= */

  if (
    url.pathname === "/api/publications"
  ) {
    if (request.method === "GET") {
      return getPublications(
        request,
        env
      );
    }

    if (request.method === "POST") {
      return createPublications(
        request,
        env
      );
    }
  }

  const publicationMatch =
    url.pathname.match(
      /^\/api\/publications\/(\d+)$/
    );

  if (publicationMatch) {
    const publicationId =
      Number(publicationMatch[1]);

    if (request.method === "PATCH") {
      return updatePublication(
        request,
        env,
        publicationId
      );
    }

    if (request.method === "DELETE") {
      return cancelPublication(
        request,
        env,
        publicationId
      );
    }
  }


  /* =======================================================
     MEDIA
  ======================================================= */

  if (
    url.pathname === "/api/media" &&
    request.method === "GET"
  ) {
    return getMediaUploads(
      request,
      env
    );
  }

  if (
    url.pathname ===
      "/api/media/tiktok/init" &&
    request.method === "POST"
  ) {
    return initialiseTikTokUpload(
      request,
      env
    );
  }

  const mediaCompleteMatch =
    url.pathname.match(
      /^\/api\/media\/tiktok\/(\d+)\/complete$/
    );

  if (
    mediaCompleteMatch &&
    request.method === "POST"
  ) {
    return completeTikTokUpload(
      request,
      env,
      Number(mediaCompleteMatch[1])
    );
  }

  const mediaStatusMatch =
    url.pathname.match(
      /^\/api\/media\/tiktok\/(\d+)\/status$/
    );

  if (
    mediaStatusMatch &&
    request.method === "GET"
  ) {
    return getTikTokPublishStatus(
      request,
      env,
      Number(mediaStatusMatch[1])
    );
  }

  if(url.pathname==="/api/media/youtube/init"&&request.method==="POST")
    return initYouTubeUpload(request,env);
  const youtubeChunkMatch=url.pathname.match(/^\/api\/media\/youtube\/(\d+)\/chunk$/);
  if(youtubeChunkMatch&&request.method==="PUT")
    return sendYouTubeChunk(request,env,Number(youtubeChunkMatch[1]));
  const youtubeStatusMatch=url.pathname.match(/^\/api\/media\/youtube\/(\d+)\/status$/);
  if(youtubeStatusMatch&&request.method==="GET")
    return youtubeUploadStatus(request,env,Number(youtubeStatusMatch[1]));


  /* =======================================================
     IDEAS
  ======================================================= */

  if (
    url.pathname === "/api/ideas"
  ) {
    if (request.method === "GET") {
      return getIdeas(
        request,
        env
      );
    }

    if (request.method === "POST") {
      return createIdea(
        request,
        env
      );
    }
  }


  /* =======================================================
     ACCOUNTS
  ======================================================= */

  if (
    url.pathname === "/api/accounts"
  ) {
    if (request.method === "GET") {
      return getAccounts(
        request,
        env
      );
    }

    if (request.method === "POST") {
      return createAccount(
        request,
        env
      );
    }
  }

  const disconnectMatch =
    url.pathname.match(
      /^\/api\/accounts\/(\d+)\/disconnect$/
    );

  if (
    disconnectMatch &&
    request.method === "POST"
  ) {
    return disconnectSocialAccount(
      request,
      env,
      Number(disconnectMatch[1])
    );
  }

  const creatorInfoMatch =
    url.pathname.match(
      /^\/api\/accounts\/(\d+)\/creator-info$/
    );

  if (
    creatorInfoMatch &&
    request.method === "GET"
  ) {
    return getTikTokCreatorInfo(
      request,
      env,
      Number(creatorInfoMatch[1])
    );
  }


  /* =======================================================
     CALENDAR
  ======================================================= */

  if (
    url.pathname === "/api/calendar" &&
    request.method === "GET"
  ) {
    return getCalendar(
      request,
      env
    );
  }


  /* =======================================================
     TIKTOK OAUTH
  ======================================================= */

  if (
    url.pathname ===
      "/api/oauth/tiktok/start" &&
    request.method === "POST"
  ) {
    return startTikTokOAuth(
      request,
      env
    );
  }

  if (
    url.pathname ===
      "/api/oauth/tiktok/callback" &&
    request.method === "GET"
  ) {
    return finishTikTokOAuth(
      request,
      env
    );
  }


  /* =======================================================
     YOUTUBE OAUTH
  ======================================================= */

  if (
    url.pathname ===
      "/api/oauth/youtube/start" &&
    request.method === "POST"
  ) {
    return startYouTubeOAuth(
      request,
      env
    );
  }

  if (
    url.pathname ===
      "/api/oauth/youtube/callback" &&
    request.method === "GET"
  ) {
    return finishYouTubeOAuth(
      request,
      env
    );
  }


  if (url.pathname === "/api/tasks" && ["GET","POST"].includes(request.method))
    return tasks(request,env);
  const taskMatch=url.pathname.match(/^\/api\/tasks\/(\d+)$/);
  if(taskMatch && request.method==="PATCH")
    return tasks(request,env,Number(taskMatch[1]));
  if(url.pathname==="/api/library" && request.method==="GET")return library(request,env);
  const libraryMatch=url.pathname.match(/^\/api\/library\/(\d+)$/);
  if(libraryMatch&&["GET","POST"].includes(request.method))
    return libraryDetail(request,env,Number(libraryMatch[1]));
  if(url.pathname==="/api/planner" && request.method==="GET")return planner(request,env);
  if(url.pathname==="/api/analytics" && request.method==="GET")return analytics(request,env);
  if(url.pathname==="/api/audit" && request.method==="GET")return getAuditLog(request,env);
  if(url.pathname==="/api/settings/password" && request.method==="POST")return changePassword(request,env);
  if(url.pathname==="/api/recurring-tasks"&&["GET","POST"].includes(request.method))
    return recurringTasks(request,env);
  const recurringMatch=url.pathname.match(/^\/api\/recurring-tasks\/(\d+)$/);
  if(recurringMatch&&request.method==="PATCH")return recurringTasks(request,env,Number(recurringMatch[1]));
  if(url.pathname==="/api/brand-groups"&&["GET","POST"].includes(request.method))
    return brandGroups(request,env);
  const brandAccountMatch=url.pathname.match(/^\/api\/accounts\/(\d+)\/brand$/);
  if(brandAccountMatch&&request.method==="PATCH")return assignBrand(request,env,"account",Number(brandAccountMatch[1]));
  const brandContentMatch=url.pathname.match(/^\/api\/content\/(\d+)\/brand$/);
  if(brandContentMatch&&request.method==="PATCH")return assignBrand(request,env,"content",Number(brandContentMatch[1]));
  if(url.pathname==="/api/notifications"&&request.method==="GET")return notifications(request,env);
  if(url.pathname==="/api/assistant/context"&&request.method==="GET")return assistantContext(request,env);
  if(url.pathname==="/api/integrations/status"&&request.method==="GET")return integrationStatus(request,env);
  if(url.pathname==="/api/github/repos"&&["GET","POST"].includes(request.method))
    return githubRepos(request,env);
  const githubIssuesMatch=url.pathname.match(/^\/api\/github\/repos\/(\d+)\/issues$/);
  if(githubIssuesMatch&&request.method==="GET")return githubIssues(request,env,Number(githubIssuesMatch[1]));

  /* =======================================================
     404
  ======================================================= */

  return json(
    {
      ok: false,
      error: "NOT_FOUND"
    },
    404,
    request
  );
}


/* =========================================================
   DASHBOARD
========================================================= */

async function dashboard(
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

  const user =
    session.user;

  const [
    projects,
    tasks,
    publications,
    recentContent,
    ideas
  ] = await Promise.all([

    env.DB
      .prepare(`
        SELECT
          id,
          name,
          slug,
          project_type,
          status,
          accent_colour

        FROM projects

        WHERE user_id = ?
          AND status != 'archived'

        ORDER BY
          updated_at DESC

        LIMIT 8
      `)
      .bind(user.id)
      .all(),


    env.DB
      .prepare(`
        SELECT
          tasks.id,
          tasks.title,
          tasks.status,
          tasks.priority,
          tasks.due_at,

          projects.name
            AS project_name

        FROM tasks

        LEFT JOIN projects
          ON projects.id =
             tasks.project_id

        WHERE tasks.user_id = ?

          AND tasks.status
            NOT IN (
              'done',
              'cancelled'
            )

        ORDER BY

          CASE tasks.priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            ELSE 4
          END,

          tasks.due_at ASC

        LIMIT 10
      `)
      .bind(user.id)
      .all(),


    env.DB
      .prepare(`
        SELECT
          publication_jobs.id,
          publication_jobs.platform,
          publication_jobs.publish_state,
          publication_jobs.scheduled_at,
          publication_jobs.attempt_count,
          publication_jobs.last_error,

          content.id
            AS content_id,

          content.title,

          projects.id
            AS project_id,

          projects.name
            AS project_name,

          social_accounts.id
            AS social_account_id,

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

          AND publication_jobs.publish_state
            IN (
              'ready',
              'queued',
              'processing',
              'retrying'
            )

        ORDER BY

          CASE
            WHEN publication_jobs.scheduled_at
              IS NULL
            THEN 1
            ELSE 0
          END,

          publication_jobs.scheduled_at ASC,
          publication_jobs.created_at ASC

        LIMIT 10
      `)
      .bind(user.id)
      .all(),


    env.DB
      .prepare(`
        SELECT
          content.id,
          content.project_id,
          content.title,
          content.content_type,
          content.status,
          content.updated_at,

          projects.name
            AS project_name

        FROM content

        INNER JOIN projects
          ON projects.id =
             content.project_id

        WHERE content.user_id = ?
          AND content.status != 'archived'

        ORDER BY
          content.updated_at DESC

        LIMIT 8
      `)
      .bind(user.id)
      .all(),


    env.DB
      .prepare(`
        SELECT
          COUNT(*) AS total

        FROM ideas

        WHERE user_id = ?
          AND status = 'inbox'
      `)
      .bind(user.id)
      .first()
  ]);

  return json(
    {
      ok: true,

      user,

      projects:
        projects.results || [],

      tasks:
        tasks.results || [],

      publications:
        publications.results || [],

      recentContent:
        recentContent.results || [],

      ideaCount:
        Number(
          ideas?.total || 0
        )
    },
    200,
    request
  );
}

