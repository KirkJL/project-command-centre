"use strict";

import {
  handleRequest
} from "./src/router.js";

import {
  json
} from "./src/http.js";

import {
  processPublicationQueue
} from "./src/publicationProcessor.js";


export default {

  async fetch(
    request,
    env,
    ctx
  ) {
    try {
      return await handleRequest(
        request,
        env,
        ctx
      );
    } catch (error) {
      console.error(
        "Unhandled Worker error:",
        error
      );

      return json(
        {
          ok: false,
          error:
            "INTERNAL_SERVER_ERROR"
        },
        500,
        request
      );
    }
  },


  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      runScheduledTasks(
        controller,
        env
      )
    );
  }
};


async function runScheduledTasks(
  controller,
  env
) {
  try {
    console.log(
      "Scheduled Project Hub run:",
      controller?.scheduledTime ||
        Date.now()
    );

    await processPublicationQueue(
      env
    );
  } catch (error) {
    console.error(
      "Scheduled publication processor failed:",
      error
    );

    throw error;
  }
}
