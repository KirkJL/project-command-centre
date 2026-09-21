"use strict";

(() => {
  const config =
    window.APP_CONFIG;

  if (!config?.API_BASE_URL) {
    throw new Error(
      "APP_CONFIG.API_BASE_URL is not configured."
    );
  }

  const API_BASE_URL =
    config.API_BASE_URL.replace(
      /\/+$/,
      ""
    );

  let csrfToken = null;


  /* =========================================================
     JSON API
  ========================================================= */

  async function request(
    path,
    options = {}
  ) {
    const method = String(
      options.method || "GET"
    ).toUpperCase();

    const headers = new Headers(
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

    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,

        method,

        headers,

        credentials: "include",

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

    if (data?.csrfToken) {
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


  function queryString(
    values = {}
  ) {
    const params =
      new URLSearchParams();

    for (
      const [key, value] of
      Object.entries(values)
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


  function sleep(ms) {
    return new Promise(
      resolve =>
        setTimeout(
          resolve,
          ms
        )
    );
  }


  /* =========================================================
     TIKTOK DIRECT BINARY UPLOAD
  ========================================================= */

  function uploadTikTokChunk({
    uploadUrl,
    blob,
    start,
    endExclusive,
    totalSize,
    mimeType,
    onProgress
  }) {
    return new Promise(
      (resolve, reject) => {
        const xhr =
          new XMLHttpRequest();

        xhr.open(
          "PUT",
          uploadUrl,
          true
        );

        xhr.setRequestHeader(
          "Content-Type",
          mimeType
        );

        xhr.setRequestHeader(
          "Content-Range",
          `bytes ${start}-${endExclusive - 1}/${totalSize}`
        );

        xhr.upload.onprogress =
          event => {
            if (
              typeof onProgress ===
              "function"
            ) {
              onProgress({
                loaded:
                  event.loaded,
                total:
                  event.total
              });
            }
          };

        xhr.onerror = () => {
          reject(
            new Error(
              "TIKTOK_UPLOAD_NETWORK_ERROR"
            )
          );
        };

        xhr.onabort = () => {
          reject(
            new Error(
              "TIKTOK_UPLOAD_ABORTED"
            )
          );
        };

        xhr.onload = () => {
          if (
            xhr.status === 201 ||
            xhr.status === 206 ||
            (
              xhr.status >= 200 &&
              xhr.status < 300
            )
          ) {
            resolve({
              status:
                xhr.status
            });

            return;
          }

          const error =
            new Error(
              `TIKTOK_UPLOAD_HTTP_${xhr.status}`
            );

          error.status =
            xhr.status;

          reject(error);
        };

        xhr.send(blob);
      }
    );
  }


  async function uploadTikTokBinary(
    uploadUrl,
    file,
    chunkSize,
    totalChunkCount,
    onProgress = null
  ) {
    if (!(file instanceof File)) {
      throw new Error(
        "VIDEO_FILE_REQUIRED"
      );
    }

    if (file.size <= 0) {
      throw new Error(
        "INVALID_VIDEO_FILE"
      );
    }

    const totalSize =
      file.size;

    const normalChunkSize =
      Math.max(
        1,
        Number(chunkSize) ||
        totalSize
      );

    const chunks =
      Math.max(
        1,
        Number(totalChunkCount) ||
        1
      );

    let transferred = 0;

    for (
      let index = 0;
      index < chunks;
      index += 1
    ) {
      const start =
        index *
        normalChunkSize;

      if (start >= totalSize) {
        break;
      }

      const isFinal =
        index === chunks - 1;

      const endExclusive =
        isFinal
          ? totalSize
          : Math.min(
              totalSize,
              start +
              normalChunkSize
            );

      const blob =
        file.slice(
          start,
          endExclusive,
          file.type ||
          "video/mp4"
        );

      await uploadTikTokChunk({
        uploadUrl,
        blob,
        start,
        endExclusive,
        totalSize,

        mimeType:
          file.type ||
          "video/mp4",

        onProgress:
          chunkProgress => {
            const absoluteLoaded =
              transferred +
              chunkProgress.loaded;

            const percentage =
              Math.min(
                100,
                Math.round(
                  (
                    absoluteLoaded /
                    totalSize
                  ) * 100
                )
              );

            if (
              typeof onProgress ===
              "function"
            ) {
              onProgress({
                phase: "uploading",

                loaded:
                  absoluteLoaded,

                total:
                  totalSize,

                percentage
              });
            }
          }
      });

      transferred =
        endExclusive;

      if (
        typeof onProgress ===
        "function"
      ) {
        onProgress({
          phase: "uploading",

          loaded:
            transferred,

          total:
            totalSize,

          percentage:
            Math.min(
              100,
              Math.round(
                (
                  transferred /
                  totalSize
                ) * 100
              )
            )
        });
      }
    }

    return {
      ok: true
    };
  }


  /* =========================================================
     CLIENT
  ========================================================= */

  const client = {

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


    dashboard() {
      return request(
        "/api/dashboard"
      );
    },


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


    content(
      filters = {}
    ) {
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


    calendar() {
      return request(
        "/api/calendar"
      );
    },


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


    createPublications(data) {
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
    },


    /* =====================================================
       MEDIA
    ===================================================== */

    mediaUploads() {
      return request(
        "/api/media"
      );
    },


    initialiseTikTokUpload(data) {
      return request(
        "/api/media/tiktok/init",
        {
          method: "POST",
          body: data
        }
      );
    },


    completeTikTokUpload(
      mediaUploadId
    ) {
      return request(
        `/api/media/tiktok/${mediaUploadId}/complete`,
        {
          method: "POST",
          body: {}
        }
      );
    },


    tiktokUploadStatus(
      mediaUploadId
    ) {
      return request(
        `/api/media/tiktok/${mediaUploadId}/status`
      );
    },


    uploadTikTokBinary(
      uploadUrl,
      file,
      chunkSize,
      totalChunkCount,
      onProgress
    ) {
      return uploadTikTokBinary(
        uploadUrl,
        file,
        chunkSize,
        totalChunkCount,
        onProgress
      );
    },


    async waitForTikTokPublish(
      mediaUploadId,
      onStatus = null
    ) {
      /*
       * Poll every 5 seconds for up to
       * five minutes.
       *
       * If processing takes longer, the upload
       * remains in D1 and can be checked again.
       */
      const maxChecks = 60;

      for (
        let attempt = 0;
        attempt < maxChecks;
        attempt += 1
      ) {
        const result =
          await client
            .tiktokUploadStatus(
              mediaUploadId
            );

        const upload =
          result.upload;

        if (
          typeof onStatus ===
          "function"
        ) {
          onStatus(upload);
        }

        if (
          upload.upload_state ===
          "published"
        ) {
          return upload;
        }

        if (
          upload.upload_state ===
          "failed"
        ) {
          const error =
            new Error(
              upload.last_error ||
              "TIKTOK_PUBLISH_FAILED"
            );

          error.data =
            upload;

          throw error;
        }

        await sleep(5000);
      }

      const error =
        new Error(
          "TIKTOK_PROCESSING_TIMEOUT"
        );

      error.mediaUploadId =
        mediaUploadId;

      throw error;
    },


    async publishTikTokVideo({
      contentId,
      accountId,
      file,
      caption = "",
      privacyLevel =
        "SELF_ONLY",
      disableComment =
        false,
      disableDuet =
        false,
      disableStitch =
        false,
      isAigc =
        false,
      onProgress =
        null
    }) {
      if (!(file instanceof File)) {
        throw new Error(
          "VIDEO_FILE_REQUIRED"
        );
      }

      if (
        typeof onProgress ===
        "function"
      ) {
        onProgress({
          phase: "initialising",
          loaded: 0,
          total: file.size,
          percentage: 0
        });
      }

      /*
       * Worker:
       * authenticate + creator info +
       * Direct Post initialization.
       */
      const session =
        await client
          .initialiseTikTokUpload({
            contentId,
            accountId,

            fileName:
              file.name,

            mimeType:
              file.type ||
              "video/mp4",

            fileSize:
              file.size,

            caption,
            privacyLevel,
            disableComment,
            disableDuet,
            disableStitch,
            isAigc
          });

      /*
       * Browser -> TikTok directly.
       */
      await client
        .uploadTikTokBinary(
          session.uploadUrl,
          file,
          session.chunkSize,
          session.totalChunkCount,
          onProgress
        );

      /*
       * Browser transfer complete does NOT mean
       * TikTok has published the video.
       */
      await client
        .completeTikTokUpload(
          session.mediaUploadId
        );

      if (
        typeof onProgress ===
        "function"
      ) {
        onProgress({
          phase: "processing",

          loaded:
            file.size,

          total:
            file.size,

          percentage: 100
        });
      }

      /*
       * TikTok is asynchronous. Wait until the
       * provider itself confirms success/failure.
       */
      const published =
        await client
          .waitForTikTokPublish(
            session.mediaUploadId,

            upload => {
              if (
                typeof onProgress ===
                "function"
              ) {
                onProgress({
                  phase:
                    upload.upload_state,

                  providerStatus:
                    upload.providerStatus,

                  loaded:
                    file.size,

                  total:
                    file.size,

                  percentage: 100
                });
              }
            }
          );

      return {
        ok: true,

        mediaUploadId:
          session.mediaUploadId,

        publishId:
          session.publishId,

        state:
          published.upload_state,

        postId:
          published.platform_post_id ||
          null,

        creatorInfo:
          session.creatorInfo
      };
    }
  };


  /*
   * Keep BOTH names.
   *
   * login.html previously depended on
   * ProjectHubAPI.
   */
  window.ProjectHubAPI =
    Object.freeze(client);

  window.API =
    window.ProjectHubAPI;
})();
