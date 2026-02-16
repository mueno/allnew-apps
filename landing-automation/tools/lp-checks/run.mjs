import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium, firefox, webkit } from 'playwright';
import axe from 'axe-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUT_DIR = '/tmp/allnew_lp_checks';
const OUT_DIR = process.env.ALLNEW_LP_CHECKS_OUT_DIR || DEFAULT_OUT_DIR;
const INSTALL_HINT = `cd ${__dirname} && npm i && npm run install:browsers`;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function repoRoot() {
  // .../landing-automation/tools/lp-checks/run.mjs -> repo root is ../../..
  return path.resolve(__dirname, '..', '..', '..');
}

async function pickFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : null;
      server.close(() => resolve(port));
    });
  });
}

function waitForHttpReady(origin, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    function tryOnce() {
      const req = net.connect({ host: '127.0.0.1', port: Number(new URL(origin).port) }, () => {
        req.end();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`HTTP server not ready: ${origin}`));
          return;
        }
        setTimeout(tryOnce, 100);
      });
    }
    tryOnce();
  });
}

function startPythonServer({ cwd, port }) {
  const python = process.env.PYTHON || 'python3';
  const child = spawn(python, ['-m', 'http.server', String(port)], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (buf) => {
    stderr += String(buf);
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`python http.server exited code=${code}`);
      if (stderr) console.error(stderr);
    }
  });
  return child;
}

function isSameOrigin(urlText, origin) {
  try {
    return new URL(urlText).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

function summarizeAxe(violations) {
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
  for (const v of violations) {
    const impact = v.impact || 'unknown';
    if (!(impact in byImpact)) byImpact.unknown += 1;
    else byImpact[impact] += 1;
  }
  return byImpact;
}

async function runAxe(page, contextLabel, outputDir) {
  await page.addScriptTag({ content: axe.source });
  const results = await page.evaluate(async () => {
    return await globalThis.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      }
    });
  });

  const reportPath = path.join(outputDir, `axe_${contextLabel}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  const violations = results.violations || [];
  const summary = summarizeAxe(violations);
  const failList = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  return { reportPath, summary, failListCount: failList.length };
}

async function runCase({ browserType, origin, lang, viewport, blockExternal, outputDir }) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  const consoleErrors = [];
  const badResponses = [];
  const blockedRequests = [];

  page.on('pageerror', (err) => consoleErrors.push({ type: 'pageerror', message: String(err) }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ type: 'console', message: msg.text() });
  });
  page.on('response', (res) => {
    try {
      const url = res.url();
      if (!isSameOrigin(url, origin)) return;
      const status = res.status();
      if (status >= 400) badResponses.push({ url, status });
    } catch {
      // ignore
    }
  });

  if (blockExternal) {
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith('data:') || url.startsWith('blob:')) return await route.continue();
      if (isSameOrigin(url, origin)) return await route.continue();
      blockedRequests.push(url);
      return await route.abort();
    });
  }

  const expectedPrivacyHref = lang === 'ja' ? 'ja/lp-privacy.html' : 'en/lp-privacy.html';
  const expectedTermsHref = lang === 'ja' ? 'ja/lp-terms.html' : 'en/lp-terms.html';
  const expectedPrivacyH1 = lang === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy';
  const expectedTermsH1 = lang === 'ja' ? '利用規約' : 'Terms';

  await page.goto(`${origin}/?lang=${lang}`, { waitUntil: 'domcontentloaded' });

  const privacy = page.locator('#footer-legal-privacy');
  const terms = page.locator('#footer-legal-terms');

  const privacyHref = await privacy.getAttribute('href');
  const termsHref = await terms.getAttribute('href');
  if (privacyHref !== expectedPrivacyHref) {
    throw new Error(`Unexpected privacy href: got=${privacyHref} expected=${expectedPrivacyHref}`);
  }
  if (termsHref !== expectedTermsHref) {
    throw new Error(`Unexpected terms href: got=${termsHref} expected=${expectedTermsHref}`);
  }

  const hero = page.locator('#hero-title');
  await hero.waitFor({ state: 'visible', timeout: 5000 });

  const caseLabel = [browserType.name(), lang, `${viewport.width}x${viewport.height}`, blockExternal ? 'noext' : 'full'].join('_');

  await page.screenshot({ path: path.join(outputDir, `lp_${caseLabel}.png`), fullPage: false });
  const axeLanding = await runAxe(page, `landing_${caseLabel}`, outputDir);

  await privacy.click();
  await page.waitForLoadState('domcontentloaded');
  const privacyH1 = await page.locator('h1').innerText();
  if (!privacyH1.includes(expectedPrivacyH1)) {
    throw new Error(`Unexpected privacy h1: got=${privacyH1} expected contains=${expectedPrivacyH1}`);
  }
  await page.screenshot({ path: path.join(outputDir, `privacy_${caseLabel}.png`), fullPage: true });
  const axePrivacy = await runAxe(page, `privacy_${caseLabel}`, outputDir);

  await page.goto(`${origin}/?lang=${lang}`, { waitUntil: 'domcontentloaded' });
  await terms.click();
  await page.waitForLoadState('domcontentloaded');
  const termsH1 = await page.locator('h1').innerText();
  if (!termsH1.includes(expectedTermsH1)) {
    throw new Error(`Unexpected terms h1: got=${termsH1} expected contains=${expectedTermsH1}`);
  }
  await page.screenshot({ path: path.join(outputDir, `terms_${caseLabel}.png`), fullPage: true });
  const axeTerms = await runAxe(page, `terms_${caseLabel}`, outputDir);

  await browser.close();

  if (badResponses.length) throw new Error(`Same-origin bad responses: ${JSON.stringify(badResponses, null, 2)}`);
  if (consoleErrors.length) throw new Error(`Console/page errors: ${JSON.stringify(consoleErrors, null, 2)}`);
  if (blockExternal && blockedRequests.length === 0) throw new Error('External-block mode enabled, but no external requests were blocked.');

  const axeFailCount = axeLanding.failListCount + axePrivacy.failListCount + axeTerms.failListCount;
  if (axeFailCount > 0) {
    throw new Error(
      `A11y violations (critical/serious) found: landing=${axeLanding.failListCount} privacy=${axePrivacy.failListCount} terms=${axeTerms.failListCount}`
    );
  }

  return {
    caseLabel,
    blockedExternalCount: blockedRequests.length,
    axe: { landing: axeLanding.summary, privacy: axePrivacy.summary, terms: axeTerms.summary }
  };
}

async function main() {
  const root = repoRoot();
  const port = Number(process.env.ALLNEW_LP_CHECKS_PORT || (await pickFreePort()));
  const origin = `http://127.0.0.1:${port}`;

  const runStamp = nowStamp();
  const runOutDir = path.join(OUT_DIR, runStamp);
  ensureDir(runOutDir);

  const server = startPythonServer({ cwd: root, port });
  const stopServer = () => {
    try {
      server.kill('SIGTERM');
    } catch {
      // ignore
    }
  };

  process.on('exit', stopServer);
  process.on('SIGINT', () => {
    stopServer();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    stopServer();
    process.exit(143);
  });

  try {
    await waitForHttpReady(origin, 5000);
  } catch (err) {
    stopServer();
    console.error(String(err));
    console.error(`Hint: ${INSTALL_HINT}`);
    process.exit(1);
  }

  const browsers = [
    { name: 'chromium', type: chromium },
    { name: 'firefox', type: firefox },
    { name: 'webkit', type: webkit }
  ];
  const langs = ['ja', 'en'];
  const viewports = [
    { name: 'desktop', viewport: { width: 1280, height: 720 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } }
  ];
  const modes = [
    { name: 'full', blockExternal: false },
    { name: 'noext', blockExternal: true }
  ];

  const results = [];
  for (const b of browsers) {
    for (const lang of langs) {
      for (const vp of viewports) {
        for (const mode of modes) {
          const label = `${b.name}_${lang}_${vp.name}_${mode.name}`;
          process.stdout.write(`RUN ${label}...\\n`);
          const r = await runCase({
            browserType: b.type,
            origin,
            lang,
            viewport: vp.viewport,
            blockExternal: mode.blockExternal,
            outputDir: runOutDir
          });
          results.push({ browser: b.name, lang, viewport: vp.name, mode: mode.name, ...r });
        }
      }
    }
  }

  fs.writeFileSync(path.join(runOutDir, 'summary.json'), JSON.stringify({ origin, results }, null, 2));
  stopServer();
  console.log('CHECKS_OK');
  console.log(runOutDir);
}

main().catch((err) => {
  console.error(String(err && err.stack ? err.stack : err));
  console.error(`If browsers are missing, run: ${INSTALL_HINT}`);
  process.exit(1);
});

