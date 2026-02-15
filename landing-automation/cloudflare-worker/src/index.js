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

function resolveSlug(app, data, payload) {
  const direct = asString(payload.slug);
  if (direct) return direct;

  const appId =
    asString(app.id) ||
    asString(data.appId) ||
    asString(payload.asc_app_id) ||
    asString(payload.appStoreId) ||
    asString(payload.app_id);
  if (appId && APP_SLUG_BY_ID[appId]) {
    return APP_SLUG_BY_ID[appId];
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
  const payload = asObject(input);
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
    asString(payload.app_id);

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
