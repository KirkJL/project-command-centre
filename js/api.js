"use strict";

(() => {
  const config =
    window.APP_CONFIG;


  if (
    !config?.API_BASE_URL
  ) {
    throw new Error(
      "APP_CONFIG.API_BASE_URL is not configured."
    );
  }


  const API_BASE_URL =
    config.API_BASE_URL.replace(
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
      String(
        options.method ||
        "GET"
      ).toUpperCase();


    const headers =
      new Headers(
        options.headers ||
        {}
      );


    headers.set(
      "Accept",
      "application/json"
    );


    if (
      options.body !==
        undefined &&
      options.body !==
        null &&
      !headers.has(
        "Content-Type"
      )
    ) {
      headers.set(
        "Content-Type",
        "application/json"
      );
    }


    if (
      method !== "GET" &&
      method !== "HEAD" &&
      path !==
        "/api/auth/login" &&
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
            options.body !==
              undefined &&
            options.body !==
              null &&
            typeof options.body !==
              "string"
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
      path !==
        "/api/auth/login"
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
      const [
        key,
        value
      ] of
      Object.entries(
        values
      )
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
     DIRECT TIKTOK BINARY TRANSFER
  ========================================================= */

  function uploadTikTokBinary(
    uploadUrl,
    file,
    chunkSize,
    totalChunkCount,
    onProgress
  ) {
    if (
      !(file instanceof File)
    ) {
      throw new Error(
        "VIDEO_FILE_REQUIRED"
      );
    }


    const size =
      file.size;


    if (
      !size ||
      size <= 0
    ) {
      throw new Error(
        "INVALID_VIDEO_FILE"
      );
    }


    const chunks =
      Math.max(
        1,
        Number(
          totalChunkCount
        ) || 1
      );


    const nominalChunkSize =
      Math.max(
        1,
        Number(
          chunkSize
        ) || size
      );


    async function sendChunk(
      index
    ) {
      let start =
        index *
        nominalChunkSize;


      /*
       * TikTok's final chunk contains all remaining
       * bytes.
       */
      let end;


      if (
        index ===
        chunks - 1
      ) {
        end = size;
      } else {
        end =
          Math.min(
            size,
            start +
            nominalChunkSize
          );
      }


      if (
        start >= size
      ) {
        return;
      }


      const blob =
        file.slice(
          start,
          end,
          file.type
        );


      await sendBlob(
        uploadUrl,
        blob,
        start,
        end,
        size,
        file.type,
        progress => {
          const absolute =
            start +
            progress.loaded;


          const percentage =
            Math.min(
              100,
              Math.round(
                absolute /
                size *
                100
              )
            );


          if (
            typeof onProgress ===
            "function"
          ) {
            onProgress({
              loaded:
                absolute,

              total:
                size,

              percentage
            });
          }
        }
      );
    }


    return (async () => {
      for (
        let index = 0;
        index < chunks;
        index += 1
      ) {
        await sendChunk(
          index
        );
      }


      if (
        typeof onProgress ===
        "function"
      ) {
        onProgress({
          loaded:
            size,

          total:
            size,

          percentage:
            100
        });
      }


      return {
        ok: true
      };
    })();
  }


  function sendBlob(
    uploadUrl,
    blob,
    start,
    endExclusive,
    totalSize,
    mimeType,
    onProgress
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const xhr =
          new XMLHttpRequest();


        xhr.open(
          "PUT",
          uploadUrl,
          true
        );


        xhr.setRequestHeader(
          "Content-Type",
          mimeType ||
          "video/mp4"
        );


        xhr.setRequestHeader(
          "Content-Length",
          String(
            blob.size
          )
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


        xhr.onerror =
          () => {
            reject(
              new Error(
                "TIKTOK_UPLOAD_NETWORK_ERROR"
              )
            );
          };


        xhr.onabort =
          () => {
            reject(
              new Error(
                "TIKTOK_UPLOAD_ABORTED"
              )
            );
          };


        xhr.onload =
          () => {
            if (
              xhr.status >= 200 &&
              xhr.status < 300
            ) {
              resolve();
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


        xhr.send(
          blob
        );
      }
    );
  }


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
        queryString(
          filters
        )
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
          method:
            "PATCH",

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
        queryString(
          filters
        )
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


    initialiseTikTokUpload(
      data
    ) {
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
      onProgress =
        null
    }) {
      if (
        !(file instanceof File)
      ) {
        throw new Error(
          "VIDEO_FILE_REQUIRED"
        );
      }


      /*
       * Step 1:
       * Worker authenticates with TikTok and creates
       * the platform upload session.
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
            disableStitch
          });


      /*
       * Step 2:
       * Browser transfers the MP4 directly to TikTok.
       *
       * The OAuth access token never enters the browser.
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
       * Step 3:
       * Tell our backend that the media transfer has
       * completed.
       */
      const completed =
        await client
          .completeTikTokUpload(
            session.mediaUploadId
          );


      return {
        ok: true,

        mediaUploadId:
          session.mediaUploadId,

        publishId:
          session.publishId,

        state:
          completed.state,

        creatorInfo:
          session.creatorInfo
      };
    }
  };


  window.ProjectHubAPI =
    Object.freeze(
      client
    );


  window.API =
    window.ProjectHubAPI;

})();
