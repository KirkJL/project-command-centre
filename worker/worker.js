"use strict";

import { handleRequest } from "./src/router.js";
import { json } from "./src/http.js";

export default {
  async fetch(request, env, ctx) {
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
          error: "INTERNAL_SERVER_ERROR"
        },
        500,
        request
      );
    }
  }
};
