import appSlugMap from "../config/app_slug_map.json";

const SUBMITTED_STATES = new Set([
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "PENDING_DEVELOPER_RELEASE",
  "PENDING_APPLE_RELEASE",
  "PROCESSING_FOR_DISTRIBUTION",
  "PREORDER_READY_FOR_SALE",
]);

const RELEASED_STATES = new Set(["READY_FOR_DISTRIBUTION", "READY_FOR_SALE"]);

const DEFAULT_SIGNATURE_HEADERS = [
  "X-Apple-Signature",
  "X-ASC-Signature",
  "X-AppStoreConnect-Signature",
  "X-Hub-Signature-256",
];
const MAX_REQUEST_BYTES = 1024 * 1024;
const DEFAULT_REPLAY_TTL_SECONDS = 3600;
const ALLOWED_EVENT_SKEW_MS = 15 * 60 * 1000;

const APP_SLUG_BY_ID = appSlugMap.by_app_id ?? {};
const APP_SLUG_BY_BUNDLE = appSlugMap.by_bundle_id ?? {};

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function asObject(value) {
  return value !== null && typeof value === "object" ? value : {};
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function normalizeStatus(rawStatus) {
  const upper = rawStatus.toUpperCase();
  if (RELEASED_STATES.has(upper)) return "released";
  if (SUBMITTED_STATES.has(upper)) return "submitted";
  if (upper.includes("REJECT")) return "rejected";
  return "unknown";
}

function pickDispatchEvent(normalizedStatus) {
  if (normalizedStatus === "released") return "asc_app_released";
  if (normalizedStatus === "submitted") return "asc_app_submitted";
  return "asc_status_changed";
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function lowerCaseHeaderMap(headers) {
  const map = new Map();
  headers.forEach((_value, key) => {
    map.set(key.toLowerCase(), key);
  });
  return map;
}

function findSignatureHeader(headers, preferred) {
  const lowerMap = lowerCaseHeaderMap(headers);
  if (headers.get(preferred) !== null) {
    return preferred;
  }

  const preferredKey = lowerMap.get(preferred.toLowerCase());
  if (preferredKey) {
    return preferredKey;
  }

  for (const candidate of DEFAULT_SIGNATURE_HEADERS) {
    const candidateKey = lowerMap.get(candidate.toLowerCase());
    if (candidateKey) {
      return candidateKey;
    }
  }

  return null;
}

function hexToBytes(hex) {
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("invalid hex signature");
  }

  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    const chunk = normalized.slice(i, i + 2);
    bytes[i / 2] = Number.parseInt(chunk, 16);
  }
  return bytes;
}

function base64ToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : `${normalized}${"=".repeat(4 - padding)}`;
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes) {
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) {
    raw += String.fromCharCode(bytes[i]);
  }
  return btoa(raw);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

function getSignatureSecrets(env) {
  const values = [env.ASC_WEBHOOK_SECRET, env.ASC_WEBHOOK_SECRET_PREVIOUS, env.ASC_WEBHOOK_SECRETS];
  const secrets = [];
  const seen = new Set();

  for (const value of values) {
    if (!value) continue;
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      secrets.push(trimmed);
    }
  }

  return secrets;
}

function extractSignatureCandidates(rawHeader, prefix) {
  const out = [];
  const seen = new Set();

  const add = (value) => {
    const cleaned = value.trim().replace(/^"+|"+$/g, "");
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    out.push(cleaned);
  };

  const raw = rawHeader.trim();
  add(raw);

  if (prefix && raw.toLowerCase().startsWith(prefix.toLowerCase())) {
    add(raw.slice(prefix.length));
  }

  for (const token of raw.split(/[,\s;]+/)) {
    if (!token) continue;
    add(token);
    const eqIndex = token.indexOf("=");
    if (eqIndex > 0 && eqIndex < token.length - 1) {
      add(token.slice(eqIndex + 1));
    }
  }

  return out;
}

function decodeSignatureCandidate(value) {
  const decoded = [];

  try {
    decoded.push({ format: "hex", bytes: hexToBytes(value) });
  } catch (_error) {
    // not hex
  }

  try {
    decoded.push({ format: "base64", bytes: base64ToBytes(value) });
  } catch (_error) {
    // not base64/base64url
  }

  return decoded;
}

async function verifySignature(request, body, secrets, env) {
  if (secrets.length === 0) {
    return { ok: false, reason: "webhook secret not configured" };
  }

  const headerName = findSignatureHeader(
    request.headers,
    env.ASC_SIGNATURE_HEADER ?? "X-Apple-Signature",
  );

  if (!headerName) {
    return { ok: false, reason: "signature header not found" };
  }

  const providedRaw = request.headers.get(headerName) ?? "";
  const prefix = env.ASC_SIGNATURE_PREFIX ?? "sha256=";
  const provided = providedRaw.startsWith(prefix)
    ? providedRaw.slice(prefix.length).trim()
    : providedRaw.trim();

  if (!provided) {
    return { ok: false, reason: "empty signature" };
  }

  const candidates = extractSignatureCandidates(provided, prefix);
  if (candidates.length === 0) {
    return { ok: false, reason: "no signature candidates found" };
  }

  for (const secret of secrets) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(body),
    );
    const expectedBytes = new Uint8Array(signatureBuffer);

    for (const candidate of candidates) {
      const decodedVariants = decodeSignatureCandidate(candidate);
      for (const variant of decodedVariants) {
        if (constantTimeEqual(expectedBytes, variant.bytes)) {
          return {
            ok: true,
            reason: `verified via ${headerName} (${variant.format})`,
          };
        }
      }
    }
  }

  return {
    ok: false,
    reason: `signature mismatch (candidates=${candidates.length}, secrets=${secrets.length})`,
  };
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function isEventDateFresh(eventDate) {
  if (!eventDate) return false;
  const parsed = Date.parse(eventDate);
  if (Number.isNaN(parsed)) return false;
  return Math.abs(Date.now() - parsed) <= ALLOWED_EVENT_SKEW_MS;
}

async function checkReplay(eventId, ttlSeconds) {
  const replayKey = await sha256Hex(eventId);
  const keyUrl = `https://replay.allnew.internal/${replayKey}`;
  const cacheKey = new Request(keyUrl, { method: "GET" });

  const hit = await caches.default.match(cacheKey);
  if (hit) {
    return true;
  }

  const ttl = parsePositiveInt(ttlSeconds, DEFAULT_REPLAY_TTL_SECONDS);
  await caches.default.put(
    cacheKey,
    new Response("seen", {
      headers: {
        "Cache-Control": `max-age=${ttl}`,
      },
    }),
  );
  return false;
}

/**
 * Decode the payload segment of a JWS (JSON Web Signature) token.
 * JWS tokens have the form: header.payload.signature (each Base64url-encoded).
 * Returns the parsed JSON from the payload segment, or null on failure.
 *
 * NOTE: This only decodes -- it does NOT verify the JWS signature.
 * Signature verification of the outer HTTP request is handled separately
 * by verifySignature() using HMAC. The JWS token signature (ES256/RS256
 * from Apple) would require Apple's public key and is not verified here.
 */
function decodeJwsPayload(jws) {
  if (typeof jws !== "string") return null;
  const parts = jws.split(".");
  if (parts.length !== 3) return null;

  try {
    const bytes = base64ToBytes(parts[1]);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

/**
 * Map App Store Server Notifications v2 notification types to
 * version state strings that normalizeStatus() understands.
 *
 * ASC v2 notifications use notificationType/subtype instead of
 * appStoreVersion.state. This maps the relevant notification types
 * to the state strings the rest of the pipeline expects.
 */
function notificationTypeToStatus(notificationType, subtype) {
  const upper = (notificationType || "").toUpperCase();
  const sub = (subtype || "").toUpperCase();

  // App lifecycle notifications
  if (upper === "DID_CHANGE_RENEWAL_STATUS" || upper === "SUBSCRIBED" || upper === "DID_RENEW") {
    return "READY_FOR_SALE";
  }
  if (upper === "EXPIRED" || upper === "REVOKE") {
    return "REMOVED_FROM_SALE";
  }

  // Version state change notifications (ASC API webhooks)
  if (upper === "APP_STORE_VERSION_STATE_CHANGED") {
    // subtype may carry the actual state
    if (sub) return sub;
    return "READY_FOR_DISTRIBUTION";
  }

  // Fallback: pass through the notification type itself
  return upper || "unknown";
}

/**
 * Unwrap an ASC payload that may be wrapped in a JWS signedPayload envelope.
 *
 * App Store Server Notifications v2 sends: { "signedPayload": "<JWS>" }
 * The JWS body contains: { notificationType, subtype, data: { appAppleId, bundleId, ... } }
 *
 * This function detects the signedPayload wrapper, decodes the JWS,
 * and reshapes the v2 fields into the normalizeAscPayload-compatible format
 * (matching the sample at examples/asc-webhook.sample.json).
 *
 * Returns the original input unchanged if no signedPayload is present.
 */
function unwrapSignedPayload(input) {
  const outer = asObject(input);
  const signed = outer.signedPayload;
  if (!signed || typeof signed !== "string") {
    return input;
  }

  const decoded = decodeJwsPayload(signed);
  if (!decoded) {
    // JWS decode failed -- fall through to existing normalizer
    // which will produce an empty result (caller handles gracefully)
    console.warn("signedPayload JWS decode failed, falling through");
    return input;
  }

  const decodedData = asObject(decoded.data);

  // App Store Server Notifications v2 uses numeric appAppleId, not string app.id.
  // It also may lack the nested app/appStoreVersion structure.
  // Reshape into the format normalizeAscPayload() already handles.
  const appAppleId = decodedData.appAppleId ?? decoded.appAppleId ?? "";
  const bundleId = asString(decodedData.bundleId) || asString(decoded.bundleId);

  const notificationType = asString(decoded.notificationType);
  const subtype = asString(decoded.subtype);
  const inferredStatus = notificationTypeToStatus(notificationType, subtype);

  // Try to decode signedTransactionInfo for additional context (optional)
  let transactionAppName = "";
  const signedTx = decodedData.signedTransactionInfo;
  if (signedTx && typeof signedTx === "string") {
    const txInfo = decodeJwsPayload(signedTx);
    if (txInfo) {
      transactionAppName = asString(txInfo.appName);
    }
  }

  // Build a payload in the "Shape 1" format that normalizeAscPayload already handles
  return {
    eventId: asString(decoded.notificationUUID) || asString(decoded.notificationId),
    eventType: notificationType || "SIGNED_NOTIFICATION",
    eventDate: asString(decoded.signedDate)
      ? new Date(Number(decoded.signedDate) || 0).toISOString().replace(/\.\d{3}Z$/, "Z")
      : nowIso(),
    data: {
      app: {
        id: String(appAppleId),
        bundleId: bundleId,
        name: transactionAppName,
      },
      appStoreVersion: {
        state: inferredStatus,
      },
      // Preserve v2-specific fields for downstream consumers
      environment: asString(decodedData.environment),
    },
    // Preserve the original notification fields for logging/debugging
    _v2_notification: {
      notificationType: notificationType,
      subtype: subtype,
      decoded: true,
    },
  };
}

function resolveSlug(app, data, payload) {
  const direct = asString(payload.slug);
  if (direct) return direct;

  // Try string-based app ID first, then coerce numeric appAppleId to string
  const appId =
    asString(app.id) ||
    asString(data.appId) ||
    asString(payload.asc_app_id) ||
    asString(payload.appStoreId) ||
    asString(payload.app_id);
  // Also handle numeric appAppleId from App Store Server Notifications v2
  const appIdStr = appId || (data.appAppleId != null ? String(data.appAppleId) : "");
  if (appIdStr && APP_SLUG_BY_ID[appIdStr]) {
    return APP_SLUG_BY_ID[appIdStr];
  }

  const bundleId =
    asString(app.bundleId) ||
    asString(app.bundleID) ||
    asString(data.bundleId) ||
    asString(payload.bundle_id) ||
    asString(payload.bundleId);
  if (bundleId && APP_SLUG_BY_BUNDLE[bundleId]) {
    return APP_SLUG_BY_BUNDLE[bundleId];
  }

  return "";
}

function normalizeAscPayload(input) {
  // Unwrap JWS signedPayload envelope if present (ASC v2 notifications)
  const unwrapped = unwrapSignedPayload(input);
  const payload = asObject(unwrapped);
  const data = asObject(payload.data);
  const app = asObject(data.app);
  const appStoreVersion = asObject(data.appStoreVersion);

  const statusRaw =
    asString(appStoreVersion.state) ||
    asString(data.status) ||
    asString(payload.status) ||
    asString(payload.app_store_state);
  const normalizedStatus = normalizeStatus(statusRaw || "unknown");

  const ascAppId =
    asString(app.id) ||
    asString(data.appId) ||
    asString(payload.asc_app_id) ||
    asString(payload.appStoreId) ||
    asString(payload.app_id) ||
    // App Store Server Notifications v2: appAppleId is numeric
    (data.appAppleId != null ? String(data.appAppleId) : "");

  const bundleId =
    asString(app.bundleId) ||
    asString(app.bundleID) ||
    asString(data.bundleId) ||
    asString(payload.bundle_id) ||
    asString(payload.bundleId);

  return {
    relay_version: 1,
    event_id: asString(payload.eventId) || asString(payload.id),
    event_type: asString(payload.eventType) || asString(payload.type),
    event_date:
      asString(payload.eventDate) ||
      asString(payload.event_date),
    received_at: nowIso(),
    app: {
      slug: resolveSlug(app, data, payload),
      status: statusRaw || normalizedStatus,
      normalized_status: normalizedStatus,
      asc_app_id: ascAppId,
      bundle_id: bundleId,
      name:
        asString(app.name) ||
        asString(data.appName) ||
        asString(payload.name) ||
        asString(payload.app_name),
      app_store_url:
        asString(app.appStoreUrl) ||
        asString(app.url) ||
        asString(payload.app_store_url) ||
        asString(payload.appStoreUrl),
      first_screenshot_url:
        asString(payload.first_screenshot_url) ||
        asString(payload.promo_image_url) ||
        asString(data.firstScreenshotUrl) ||
        asString(appStoreVersion.firstScreenshotUrl),
      release_date:
        asString(payload.release_date) ||
        asString(payload.releaseDate) ||
        asString(data.releaseDate) ||
        asString(appStoreVersion.releaseDate),
    },
  };
}

async function sendRepositoryDispatch(env, eventType, clientPayload) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "allnew-asc-webhook-relay/1.0",
    },
    body: JSON.stringify({
      event_type: eventType,
      client_payload: clientPayload,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub dispatch failed: ${response.status} ${body}`);
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "method not allowed" }, 405);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/webhooks/asc") {
      return jsonResponse({ ok: false, error: "not found" }, 404);
    }

    if (!env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_TOKEN) {
      return jsonResponse({ ok: false, error: "server misconfiguration" }, 500);
    }

    const signatureSecrets = getSignatureSecrets(env);
    if (signatureSecrets.length === 0) {
      return jsonResponse({ ok: false, error: "server misconfiguration" }, 500);
    }

    const contentLengthHeader = request.headers.get("Content-Length");
    if (contentLengthHeader !== null) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        return jsonResponse({ ok: false, error: "invalid content-length" }, 400);
      }
      if (contentLength > MAX_REQUEST_BYTES) {
        return jsonResponse({ ok: false, error: "payload too large" }, 413);
      }
    }

    let bodyText = "";
    try {
      bodyText = await request.text();
    } catch (error) {
      console.error("failed to read request body", error);
      return jsonResponse({ ok: false, error: "bad request" }, 400);
    }

    const bodySize = new TextEncoder().encode(bodyText).length;
    if (bodySize > MAX_REQUEST_BYTES) {
      return jsonResponse({ ok: false, error: "payload too large" }, 413);
    }

    const verification = await verifySignature(request, bodyText, signatureSecrets, env);
    if (!verification.ok) {
      console.warn("signature verification failed", verification.reason);
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (error) {
      return jsonResponse({ ok: false, error: "invalid json" }, 400);
    }

    const normalized = normalizeAscPayload(payload);
    if (!normalized.event_id) {
      return jsonResponse({ ok: false, error: "missing event_id" }, 400);
    }
    if (!isEventDateFresh(normalized.event_date)) {
      return jsonResponse({ ok: false, error: "invalid or stale event_date" }, 400);
    }

    const duplicate = await checkReplay(normalized.event_id, env.REPLAY_TTL_SECONDS);
    if (duplicate) {
      return jsonResponse({ ok: false, error: "duplicate event" }, 409);
    }

    const eventType = pickDispatchEvent(normalized.app.normalized_status);

    try {
      await sendRepositoryDispatch(env, eventType, normalized);
    } catch (error) {
      console.error("failed to dispatch GitHub event", error);
      return jsonResponse({ ok: false, error: "upstream dispatch failed" }, 502);
    }

    return jsonResponse(
      {
        ok: true,
        event_type: eventType,
        event_id: normalized.event_id,
      },
      202,
    );
  },
};
