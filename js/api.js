"use strict";

(() => {
  const config = window.APP_CONFIG;

  if (
    !config ||
    !config.API_BASE_URL
  ) {
    throw new Error(
      "APP_CONFIG.API_BASE_URL is missing."
    );
  }

  const API_BASE_URL =
    String(
      config.API_BASE_URL
    ).replace(/\/+$/, "");

  let csrfToken = null;


  async function request(
    path,
    options = {}
  ) {
    const method =
      String(
        options.method || "GET"
      ).toUpperCase();

    const headers =
      new Headers(
        options.headers || {}
      );

    const fetchOptions = {
      method,
      headers,
      credentials: "include"
    };

    if (
      options.body !== undefined
    ) {
      headers.set(
        "Content-Type",
        "application/json"
      );

      fetchOptions.body =
        JSON.stringify(
          options.body
        );
    }

    if (
      method !== "GET" &&
      method !== "HEAD" &&
      method !== "OPTIONS" &&
      path !== "/api/auth/login"
    ) {
      if (!csrfToken) {
        await ensureSession();
      }

      if (csrfToken) {
        headers.set(
          "X-CSRF-Token",
          csrfToken
        );
      }
    }

    let response;

    try {
      response = await fetch(
        `${API_BASE_URL}${path}`,
        fetchOptions
      );
    } catch (error) {
      const networkError =
        new Error(
          "Unable to reach the API."
        );

      networkError.cause = error;

      throw networkError;
    }

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (
      data &&
      typeof data.csrfToken === "string"
    ) {
      csrfToken =
        data.csrfToken;
    }

    if (
      response.status === 401 &&
      path !== "/api/auth/login"
    ) {
      csrfToken = null;

      const loginUrl =
        new URL(
          "./login.html",
          window.location.href
        );

      window.location.replace(
        loginUrl.href
      );

      throw new Error(
        "Authentication required."
      );
    }

    if (!response.ok) {
      const error =
        new Error(
          data.error ||
          `Request failed (${response.status})`
        );

      error.status =
        response.status;

      error.data = data;

      throw error;
    }

    return data;
  }


  async function ensureSession() {
    const data =
      await request(
        "/api/auth/me"
      );

    if (data.csrfToken) {
      csrfToken =
        data.csrfToken;
    }

    return data;
  }


  function buildQuery(params) {
    const query =
      new URLSearchParams();

    for (
      const [key, value]
      of Object.entries(params)
    ) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        query.set(
          key,
          String(value)
        );
      }
    }

    const text =
      query.toString();

    return text
      ? `?${text}`
      : "";
  }


  window.API = Object.freeze({
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
      return ensureSession();
    },

    async dashboard() {
      return request(
        "/api/dashboard"
      );
    },

    async projects() {
      return request(
        "/api/projects"
      );
    },

    async createProject(project) {
      return request(
        "/api/projects",
        {
          method: "POST",
          body: project
        }
      );
    },

    async content(filters = {}) {
      return request(
        "/api/content" +
        buildQuery(filters)
      );
    },

    async createContent(content) {
      return request(
        "/api/content",
        {
          method: "POST",
          body: content
        }
      );
    },

    async updateContentStatus(
      id,
      status
    ) {
      return request(
        `/api/content/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          body: {
            status
          }
        }
      );
    },

    async ideas() {
      return request(
        "/api/ideas"
      );
    },

    async createIdea(idea) {
      return request(
        "/api/ideas",
        {
          method: "POST",
          body: idea
        }
      );
    },

    async accounts() {
      return request(
        "/api/accounts"
      );
    },

    async createAccount(account) {
      return request(
        "/api/accounts",
        {
          method: "POST",
          body: account
        }
      );
    },

    async disconnectAccount(id) {
      return request(
        `/api/accounts/${encodeURIComponent(id)}/disconnect`,
        {
          method: "POST"
        }
      );
    },

    async creatorInfo(id) {
      return request(
        `/api/accounts/${encodeURIComponent(id)}/creator-info`
      );
    },

    async calendar() {
      return request(
        "/api/calendar"
      );
    },

    async startTikTok(projectId) {
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

    async startYouTube(projectId) {
      return request(
        "/api/oauth/youtube/start",
        {
          method: "POST",
          body: {
            projectId
          }
        }
      );
    }
  });
})();
