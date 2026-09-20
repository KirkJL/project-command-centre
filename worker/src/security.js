"use strict";

import {
  SESSION_COOKIE,
  SESSION_LENGTH_SECONDS
} from "./config.js";

export function createSecureToken() {
  return bytesToBase64Url(
    crypto.getRandomValues(
      new Uint8Array(32)
    )
  );
}

export function createSessionCookie(
  sessionId,
  maxAge =
    SESSION_LENGTH_SECONDS
) {
  return (
    `${SESSION_COOKIE}=` +
    `${encodeURIComponent(sessionId)}; ` +
    "Path=/; " +
    "HttpOnly; " +
    "Secure; " +
    "SameSite=None; " +
    `Max-Age=${maxAge}`
  );
}

export function parseCookies(
  cookieHeader
) {
  const result = {};

  for (
    const part
    of String(cookieHeader).split(";")
  ) {
    const separator =
      part.indexOf("=");

    if (separator < 1) {
      continue;
    }

    const key =
      part.slice(
        0,
        separator
      ).trim();

    const value =
      part.slice(
        separator + 1
      ).trim();

    if (!key) {
      continue;
    }

    try {
      result[key] =
        decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }

  return result;
}

export function validCsrf(
  request,
  session
) {
  const supplied =
    request.headers.get(
      "X-CSRF-Token"
    );

  if (
    !supplied ||
    !session?.csrfToken
  ) {
    return false;
  }

  return constantTimeStringEqual(
    supplied,
    session.csrfToken
  );
}

export async function verifyPassword(
  password,
  stored
) {
  if (
    typeof stored !== "string"
  ) {
    return false;
  }

  const parts =
    stored.split(":");

  if (parts.length !== 3) {
    return false;
  }

  const iterations =
    Number(parts[0]);

  if (
    !Number.isInteger(
      iterations
    ) ||
    iterations !== 100000
  ) {
    return false;
  }

  let salt;
  let expected;

  try {
    salt =
      base64ToBytes(
        parts[1]
      );

    expected =
      base64ToBytes(
        parts[2]
      );
  } catch {
    return false;
  }

  if (
    salt.length === 0 ||
    expected.length === 0
  ) {
    return false;
  }

  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        password
      ),
      {
        name: "PBKDF2"
      },
      false,
      ["deriveBits"]
    );

  const derived =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations
      },
      keyMaterial,
      expected.length * 8
    );

  return constantTimeBytesEqual(
    new Uint8Array(derived),
    expected
  );
}

export async function encryptSecret(
  env,
  plaintext
) {
  if (
    !env.TOKEN_ENCRYPTION_KEY
  ) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED"
    );
  }

  const key =
    await getEncryptionKey(
      env.TOKEN_ENCRYPTION_KEY
    );

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      new TextEncoder().encode(
        plaintext
      )
    );

  return [
    bytesToBase64Url(iv),
    bytesToBase64Url(
      new Uint8Array(
        encrypted
      )
    )
  ].join(".");
}

export async function decryptSecret(
  env,
  encryptedValue
) {
  if (
    !env.TOKEN_ENCRYPTION_KEY
  ) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED"
    );
  }

  if (
    typeof encryptedValue !==
      "string" ||
    !encryptedValue.includes(".")
  ) {
    throw new Error(
      "INVALID_ENCRYPTED_VALUE"
    );
  }

  const parts =
    encryptedValue.split(".");

  if (parts.length !== 2) {
    throw new Error(
      "INVALID_ENCRYPTED_VALUE"
    );
  }

  const key =
    await getEncryptionKey(
      env.TOKEN_ENCRYPTION_KEY
    );

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv:
          base64UrlToBytes(
            parts[0]
          )
      },
      key,
      base64UrlToBytes(
        parts[1]
      )
    );

  return new TextDecoder().decode(
    decrypted
  );
}

async function getEncryptionKey(
  secret
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        secret
      )
    );

  return crypto.subtle.importKey(
    "raw",
    digest,
    {
      name: "AES-GCM"
    },
    false,
    [
      "encrypt",
      "decrypt"
    ]
  );
}

export function createPkceVerifier() {
  return bytesToBase64Url(
    crypto.getRandomValues(
      new Uint8Array(64)
    )
  );
}

export async function createPkceChallenge(
  verifier
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        verifier
      )
    );

  return bytesToBase64Url(
    new Uint8Array(digest)
  );
}

export async function hashText(
  value
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        String(value)
      )
    );

  return bytesToHex(
    new Uint8Array(digest)
  );
}

export function delayFailure() {
  return new Promise(
    resolve => {
      setTimeout(
        resolve,
        350
      );
    }
  );
}

function constantTimeStringEqual(
  a,
  b
) {
  return constantTimeBytesEqual(
    new TextEncoder().encode(
      String(a)
    ),
    new TextEncoder().encode(
      String(b)
    )
  );
}

function constantTimeBytesEqual(
  a,
  b
) {
  const maxLength =
    Math.max(
      a.length,
      b.length
    );

  let difference =
    a.length ^ b.length;

  for (
    let i = 0;
    i < maxLength;
    i += 1
  ) {
    difference |=
      (i < a.length
        ? a[i]
        : 0) ^
      (i < b.length
        ? b[i]
        : 0);
  }

  return difference === 0;
}

export function bytesToBase64Url(
  bytes
) {
  let binary = "";

  const chunkSize =
    0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          i,
          i + chunkSize
        )
      );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(
  value
) {
  let base64 =
    String(value)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (
    base64.length % 4 !== 0
  ) {
    base64 += "=";
  }

  return base64ToBytes(
    base64
  );
}

function base64ToBytes(
  value
) {
  const binary =
    atob(String(value));

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i += 1
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToHex(bytes) {
  let output = "";

  for (const byte of bytes) {
    output +=
      byte
        .toString(16)
        .padStart(2, "0");
  }

  return output;
      }
