"use strict";

window.ProjectHubAPI = (() => {

  const API_BASE_URL =
    window.APP_CONFIG.API_BASE_URL;

  async function request(
    path,
    options = {}
  ) {
    const response =
      await fetch(
        `${API_BASE_URL}${path}`,
        {
          method:
            options.method || "GET",

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",

            ...(options.headers || {})
          },

          body:
            options.body
              ? JSON.stringify(
                  options.body
                )
              : undefined
        }
      );

    let data = null;

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

    if (!response.ok) {
      const error =
        new Error(
          data.error ||
          "REQUEST_FAILED"
        );

      error.status =
        response.status;

      error.data =
        data;

      throw error;
    }

    return data;
  }


  function login(
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
  }


  function logout() {
    return request(
      "/api/auth/logout",
      {
        method: "POST"
      }
    );
  }


  function me() {
    return request(
      "/api/auth/me"
    );
  }


  function dashboard() {
    return request(
      "/api/dashboard"
    );
  }


  function projects() {
    return request(
      "/api/projects"
    );
  }


  function createProject(project) {
    return request(
      "/api/projects",
      {
        method: "POST",
        body: project
      }
    );
  }


  return Object.freeze({
    login,
    logout,
    me,
    dashboard,
    projects,
    createProject
  });

})();
