"use strict";

(() => {
  const config = window.APP_CONFIG;

  if (!config?.API_BASE_URL) {
    throw new Error(
      "APP_CONFIG.API_BASE_URL is not configured."
    );
  }

  const API_BASE_URL =
    config.API_BASE_URL.replace(/\/+$/, "");

  let csrfToken = null;


  /* =========================================================
     CORE REQUEST
  ========================================================= */

  async function request(path, options = {}) {
    const method =
      String(
        options.method || "GET"
      ).toUpperCase();

    const headers =
      new Headers(
        options.headers || {}
      );

    headers.set(
      "Accept",
      "application/json"
    );


    if (
      options.body !== undefined &&
      options.body !== null &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json"
      );
    }


    if (
      method !== "GET" &&
      method !== "HEAD" &&
      path !== "/api/auth/login" &&
      csrfToken
    ) {
      headers.set(
        "X-CSRF-Token",
        csrfToken
      );
    }


    const response =
      await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...options,

          method,

          headers,

          credentials:
            "include",

          body:
            options.body !== undefined &&
            options.body !== null &&
            typeof options.body !== "string"
              ? JSON.stringify(
                  options.body
                )
              : options.body
        }
      );


    let data = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }


    if (
      data?.csrfToken
    ) {
      csrfToken =
        data.csrfToken;
    }


    if (
      response.status === 401 &&
      path !== "/api/auth/login"
    ) {
      window.location.href =
        "./login.html";

      const error =
        new Error(
          "UNAUTHENTICATED"
        );

      error.status = 401;
      error.data = data;

      throw error;
    }


    if (!response.ok) {
      const error =
        new Error(
          data?.error ||
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


  /* =========================================================
     QUERY STRING
  ========================================================= */

  function queryString(
    values = {}
  ) {
    const params =
      new URLSearchParams();


    for (
      const [key, value]
      of Object.entries(values)
    ) {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        continue;
      }

      params.set(
        key,
        String(value)
      );
    }


    const string =
      params.toString();


    return string
      ? `?${string}`
      : "";
  }


  /* =========================================================
     API CLIENT
  ========================================================= */

  const client = {

    /* =======================================================
       AUTH
    ======================================================= */

    login(
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


    logout() {
      return request(
        "/api/auth/logout",
        {
          method: "POST",
          body: {}
        }
      );
    },


    me() {
      return request(
        "/api/auth/me"
      );
    },


    ensureSession() {
      return request(
        "/api/auth/me"
      );
    },


    /* =======================================================
       DASHBOARD
    ======================================================= */

    dashboard() {
      return request(
        "/api/dashboard"
      );
    },


    /* =======================================================
       PROJECTS
    ======================================================= */

    projects() {
      return request(
        "/api/projects"
      );
    },


    createProject(data) {
      return request(
        "/api/projects",
        {
          method: "POST",
          body: data
        }
      );
    },


    /* =======================================================
       CONTENT
    ======================================================= */

    content(filters = {}) {
      return request(
        "/api/content" +
        queryString(filters)
      );
    },


    createContent(data) {
      return request(
        "/api/content",
        {
          method: "POST",
          body: data
        }
      );
    },


    updateContentStatus(
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


    /* =======================================================
       IDEAS
    ======================================================= */

    ideas() {
      return request(
        "/api/ideas"
      );
    },


    createIdea(data) {
      return request(
        "/api/ideas",
        {
          method: "POST",
          body: data
        }
      );
    },


    /* =======================================================
       ACCOUNTS
    ======================================================= */

    accounts() {
      return request(
        "/api/accounts"
      );
    },


    createAccount(data) {
      return request(
        "/api/accounts",
        {
          method: "POST",
          body: data
        }
      );
    },


    disconnectAccount(id) {
      return request(
        `/api/accounts/${id}/disconnect`,
        {
          method: "POST",
          body: {}
        }
      );
    },


    creatorInfo(id) {
      return request(
        `/api/accounts/${id}/creator-info`
      );
    },


    /* =======================================================
       OAUTH
    ======================================================= */

    startTikTok(projectId) {
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


    startYouTube(projectId) {
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


    /* =======================================================
       CALENDAR
    ======================================================= */

    calendar() {
      return request(
        "/api/calendar"
      );
    },


    /* =======================================================
       PUBLICATIONS
    ======================================================= */

    publications(
      filters = {}
    ) {
      return request(
        "/api/publications" +
        queryString(filters)
      );
    },


    publishingData(
      contentId
    ) {
      return request(
        `/api/content/${contentId}/publishing`
      );
    },


    createPublications(
      data
    ) {
      return request(
        "/api/publications",
        {
          method: "POST",
          body: data
        }
      );
    },


    updatePublication(
      id,
      data
    ) {
      return request(
        `/api/publications/${id}`,
        {
          method: "PATCH",
          body: data
        }
      );
    },


    cancelPublication(id) {
      return request(
        `/api/publications/${id}`,
        {
          method: "DELETE",
          body: {}
        }
      );
    }
  };


  /* =========================================================
     BACKWARDS COMPATIBILITY

     login.html uses ProjectHubAPI
     app.js uses API

     Both point to exactly the same client.
  ========================================================= */

  window.ProjectHubAPI =
    Object.freeze(client);

  window.API =
    window.ProjectHubAPI;

})();
