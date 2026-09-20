"use strict";

window.ProjectHubAPI = (() => {

  const baseUrl =
    window.APP_CONFIG
      .API_BASE_URL
      .replace(
        /\/+$/,
        ""
      );

  let csrfToken =
    null;


  async function request(
    path,
    options = {}
  ) {

    const method =
      (
        options.method ||
        "GET"
      ).toUpperCase();


    const headers = {

      Accept:
        "application/json",

      ...(
        options.headers ||
        {}
      )

    };


    if (
      options.body !==
      undefined
    ) {

      headers[
        "Content-Type"
      ] =
        "application/json";

    }


    if (
      csrfToken &&
      ![
        "GET",
        "HEAD",
        "OPTIONS"
      ].includes(
        method
      ) &&
      path !==
        "/api/auth/login"
    ) {

      headers[
        "X-CSRF-Token"
      ] =
        csrfToken;

    }


    const response =
      await fetch(
        `${baseUrl}${path}`,
        {
          method,

          credentials:
            "include",

          headers,

          body:
            options.body ===
            undefined
              ? undefined
              : JSON.stringify(
                  options.body
                )
        }
      );


    let data;


    try {

      data =
        await response.json();

    } catch {

      data = {
        ok: false,
        error:
          "INVALID_SERVER_RESPONSE"
      };

    }


    if (
      data.csrfToken
    ) {

      csrfToken =
        data.csrfToken;

    }


    if (
      response.status ===
        401 &&
      path !==
        "/api/auth/login"
    ) {

      window.location.href =
        "./login.html";


      throw new Error(
        "UNAUTHENTICATED"
      );

    }


    if (!response.ok) {

      const error =
        new Error(
          data.error ||
          `HTTP_${response.status}`
        );


      error.status =
        response.status;


      error.data =
        data;


      throw error;

    }


    return data;

  }


  return {

    /* =========================
       AUTH
       ========================= */

    async login(
      username,
      password
    ) {

      return request(
        "/api/auth/login",
        {
          method: "POST",

          body: {
            username,
            password
          }
        }
      );

    },


    async logout() {

      return request(
        "/api/auth/logout",
        {
          method: "POST"
        }
      );

    },


    async me() {

      return request(
        "/api/auth/me"
      );

    },


    /* =========================
       DASHBOARD
       ========================= */

    async dashboard() {

      return request(
        "/api/dashboard"
      );

    },


    /* =========================
       PROJECTS
       ========================= */

    async projects() {

      return request(
        "/api/projects"
      );

    },


    async createProject(
      data
    ) {

      return request(
        "/api/projects",
        {
          method: "POST",
          body: data
        }
      );

    },


    /* =========================
       CONTENT
       ========================= */

    async content(
      filters = {}
    ) {

      const params =
        new URLSearchParams();


      if (
        filters.projectId
      ) {

        params.set(
          "projectId",
          filters.projectId
        );

      }


      if (
        filters.status
      ) {

        params.set(
          "status",
          filters.status
        );

      }


      const query =
        params.toString();


      return request(
        `/api/content${
          query
            ? `?${query}`
            : ""
        }`
      );

    },


    async createContent(
      data
    ) {

      return request(
        "/api/content",
        {
          method: "POST",
          body: data
        }
      );

    },


    async updateContentStatus(
      id,
      status
    ) {

      return request(
        `/api/content/${id}/status`,
        {
          method: "PATCH",

          body: {
            status
          }
        }
      );

    },


    /* =========================
       IDEAS
       ========================= */

    async ideas() {

      return request(
        "/api/ideas"
      );

    },


    async createIdea(
      data
    ) {

      return request(
        "/api/ideas",
        {
          method: "POST",
          body: data
        }
      );

    },


    /* =========================
       ACCOUNTS
       ========================= */

    async accounts() {

      return request(
        "/api/accounts"
      );

    },


    async createAccount(
      data
    ) {

      return request(
        "/api/accounts",
        {
          method: "POST",
          body: data
        }
      );

    },


    async disconnectAccount(
      accountId
    ) {

      return request(
        `/api/accounts/${accountId}/disconnect`,
        {
          method: "POST"
        }
      );

    },


    /* =========================
       TIKTOK
       ========================= */

    async startTikTokOAuth(
      projectId
    ) {

      return request(
        "/api/oauth/tiktok/start",
        {
          method: "POST",

          body: {
            projectId
          }
        }
      );

    },


    async tiktokCreatorInfo(
      accountId
    ) {

      return request(
        `/api/accounts/${accountId}/creator-info`
      );

    },


    /* =========================
       YOUTUBE
       ========================= */

    async startYouTubeOAuth(
      projectId
    ) {

      return request(
        "/api/oauth/youtube/start",
        {
          method: "POST",

          body: {
            projectId
          }
        }
      );

    },


    /* =========================
       CALENDAR
       ========================= */

    async calendar() {

      return request(
        "/api/calendar"
      );

    }

  };

})();
