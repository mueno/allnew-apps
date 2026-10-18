// Cloudflare Pages Function — root middleware (runs on every request).
//
// Why this exists
// ---------------
// apps.allnew.work is served from two hosts:
//   * Vercel (origin) builds ./dist via scripts/build_public_site.py, so
//     internal/excluded files are simply absent and 404 there.
//   * Cloudflare Pages (front) serves the repository tree, so those same
//     files WOULD be reachable without an explicit block.
//
// The repo-root `_redirects` file used to carry bare-status lines such as
// `/internal/* 404`. Cloudflare Pages `_redirects` only understands
// `[source] [destination] [code]`, treats a bare `404` as the destination
// (default status 302), and documents that rewrites with non-redirect
// statuses are unsupported — so those lines never blocked anything. A probe
// in production confirmed it: /test-results/.last-run.json returned 200.
//
// Cloudflare's own guidance for returning a real 404 for specific paths is a
// Pages Function, because `_redirects` cannot. This middleware is that
// function. Allowed requests fall straight through to the static-asset
// pipeline via `next()`, so `_headers` (CSP, HSTS, …) and the `_redirects`
// 301s keep applying to real pages untouched. Only blocked paths get a
// Function-generated response, and that response carries noindex headers
// itself (a `_headers` rule would not cover a Function response).
//
// The block list mirrors scripts/public_surface.py (BLOCK_ROUTE_SOURCES plus
// the attack-path probes). Keep the two in sync; tests/test_public_exposure.py
// asserts they agree.

const ALLOWLISTED_PATHS = new Set([
  // index.html references this exact runtime script; it must keep serving 200
  // even though the rest of /landing-automation/ is blocked.
  "/landing-automation/runtime/landing-runtime.js",
]);

// Directory prefixes whose entire subtree is internal/excluded. A request is
// blocked when its path equals the prefix or sits beneath it.
const BLOCKED_PREFIXES = [
  "/internal",
  "/.planning",
  "/test-results",
  "/scripts",
  "/landing-automation",
  // Attack-path probe roots (no such assets exist; block explicitly so the
  // 404 is deliberate and carries noindex instead of relying on "no file").
  "/wp-admin",
  "/wp-includes",
  "/.git",
  "/.svn",
  "/.aws",
  "/.ssh",
];

// Exact paths that are always blocked.
const BLOCKED_EXACT = new Set([
  "/.env",
  "/config.json",
  "/credentials.json",
]);

function underPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

// Pure path classifier (exported for parity tests via node).
export function isBlockedPath(pathname) {
  const path = pathname.toLowerCase();

  if (ALLOWLISTED_PATHS.has(path)) {
    return false;
  }

  // Internal markdown drafts: any *.md is non-public.
  if (path.endsWith(".md")) {
    return true;
  }

  // PHP / WordPress probes: the site is pure static, nothing executes PHP.
  if (path.endsWith(".php")) {
    return true;
  }

  // Dotfile env probes: /.env and /.env.local, /.env.production, …
  if (path === "/.env" || path.startsWith("/.env.")) {
    return true;
  }

  if (BLOCKED_EXACT.has(path)) {
    return true;
  }

  for (const prefix of BLOCKED_PREFIXES) {
    if (underPrefix(path, prefix)) {
      return true;
    }
  }

  return false;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    // Malformed percent-encoding — fall back to the raw path.
    pathname = url.pathname;
  }

  if (isBlockedPath(pathname)) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
        // Keep the security posture on blocked responses too; `_headers`
        // does not apply to Function-generated responses.
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      },
    });
  }

  return next();
}
