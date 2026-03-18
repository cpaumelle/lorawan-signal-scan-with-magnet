#!/usr/bin/env node
/**
 * SiteScan — Microshare Composer Deploy Script
 *
 * What it does:
 *   1. Gets a PLAY_SESSION token via the local proxy (localhost:8001)
 *   2. Lists all Robots, Views, Forms, and Apps in the Composer org
 *   3. Finds any existing SiteScan objects by name pattern
 *   4. PUTs the local source files to matching objects
 *   5. Prints a clear summary: what was deployed vs. what needs a manual step
 *
 * Usage:
 *   MICROSHARE_USER=you@example.com MICROSHARE_PASS=yourpassword node deploy.mjs [--env dev|prod]
 *
 * Or create .env in this directory:
 *   MICROSHARE_USER=you@example.com
 *   MICROSHARE_PASS=yourpassword
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const envFlag = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'dev';
const ENV     = ['dev', 'prod'].includes(envFlag) ? envFlag : 'dev';

// Load .env file if present
const dotenvPath = resolve(__dir, '.env');
if (existsSync(dotenvPath)) {
  readFileSync(dotenvPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const USER = process.env.MICROSHARE_USER;
const PASS = process.env.MICROSHARE_PASS;

if (!USER || !PASS) {
  console.error('Error: MICROSHARE_USER and MICROSHARE_PASS must be set (env vars or .env file)');
  process.exit(1);
}

const PROXY  = 'http://127.0.0.1:8001';
const DAPI   = ENV === 'dev' ? 'https://dapi.microshare.io' : 'https://api.microshare.io';

// Local source files (relative to this script)
const SOURCES = {
  robot: resolve(__dir, 'robot/sitescan-decode-robot.js'),
  view:  resolve(__dir, 'view/sitescan-uplinks-view.json'),
  form:  resolve(__dir, 'form/sitescan-form.html'),
  app:   resolve(__dir, 'app/sitescan-facts.json'),
};

// Name patterns to match existing Composer objects (case-insensitive substring)
const MATCH = {
  robot: 'sitescan',
  view:  'sitescan',
  form:  'sitescan',
  app:   'sitescan',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg)   { console.log(msg); }
function ok(msg)    { console.log('  ✓ ' + msg); }
function warn(msg)  { console.log('  ⚠ ' + msg); }
function info(msg)  { console.log('  → ' + msg); }
function box(title) {
  const line = '─'.repeat(60);
  console.log('\n┌' + line + '┐');
  console.log('│  ' + title.padEnd(58) + '│');
  console.log('└' + line + '┘');
}

async function request(url, opts = {}) {
  const resp = await fetch(url, opts);
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  return { status: resp.status, ok: resp.ok, data };
}

function authHeader(token) {
  return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
}

// ── Step 1: Auth ──────────────────────────────────────────────────────────────
box('Step 1 — Authenticate');
info(`Environment: ${ENV.toUpperCase()}  →  ${DAPI}`);
info(`User: ${USER}`);

const authResp = await request(`${PROXY}/login`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ username: USER, password: PASS, env: ENV }),
});

if (!authResp.ok || !authResp.data.access_token) {
  console.error('\nAuth failed:', authResp.data?.error_description || authResp.data?.error || `HTTP ${authResp.status}`);
  process.exit(1);
}

const TOKEN = authResp.data.access_token;
ok(`Token acquired (${TOKEN.slice(0, 8)}…)`);

// ── Step 2: List all Composer objects ─────────────────────────────────────────
box('Step 2 — List Composer objects');

async function listAll(type) {
  const resp = await request(`${DAPI}/${type}/*`, { headers: authHeader(TOKEN) });
  if (!resp.ok) {
    warn(`Failed to list ${type}: HTTP ${resp.status}`);
    return [];
  }
  return resp.data.objs || [];
}

const [allRobots, allViews, allForms, allApps] = await Promise.all([
  listAll('robo'),
  listAll('view'),
  listAll('form'),
  listAll('app'),
]);

ok(`Found ${allRobots.length} robot(s), ${allViews.length} view(s), ${allForms.length} form(s), ${allApps.length} app(s)`);

function findMatch(objs, pattern) {
  const p = pattern.toLowerCase();
  return objs.filter(o => (o.name || '').toLowerCase().includes(p));
}

const matchedRobots = findMatch(allRobots, MATCH.robot);
const matchedViews  = findMatch(allViews,  MATCH.view);
const matchedForms  = findMatch(allForms,  MATCH.form);
const matchedApps   = findMatch(allApps,   MATCH.app);

if (matchedRobots.length) info(`Matched robot(s): ${matchedRobots.map(o => `"${o.name}" [${o.id}]`).join(', ')}`);
if (matchedViews.length)  info(`Matched view(s):  ${matchedViews.map(o => `"${o.name}" [${o.id}]`).join(', ')}`);
if (matchedForms.length)  info(`Matched form(s):  ${matchedForms.map(o => `"${o.name}" [${o.id}]`).join(', ')}`);
if (matchedApps.length)   info(`Matched app(s):   ${matchedApps.map(o => `"${o.name}" [${o.id}]`).join(', ')}`);

// ── Step 3: PUT to matched objects ────────────────────────────────────────────
box('Step 3 — Deploy');

const results = { deployed: [], skipped: [] };

// ── Robot ──────────────────────────────────────────────────────────────────────
const robotScript = readFileSync(SOURCES.robot, 'utf-8');

if (matchedRobots.length === 0) {
  warn('No existing robot matched "sitescan" — skipping robot deploy');
  results.skipped.push({
    type: 'Robot',
    reason: 'No match found',
    action: 'Create in Composer UI → paste the script → re-run deploy',
  });
} else {
  for (const robot of matchedRobots) {
    info(`Deploying robot "${robot.name}" [${robot.id}] …`);
    const payload = {
      name:    robot.name,
      desc:    robot.desc || '',
      recType: robot.recType,
      tags:    robot.tags || [],
      data:    { ...robot.data, script: robotScript },
      id:      robot.id,
    };
    const resp = await request(`${DAPI}/robo/${robot.recType}/${robot.id}`, {
      method:  'PUT',
      headers: authHeader(TOKEN),
      body:    JSON.stringify(payload),
    });
    if (resp.ok) {
      ok(`Robot deployed  →  ${DAPI}/robo/${robot.recType}/${robot.id}`);
      results.deployed.push({ type: 'Robot', name: robot.name, id: robot.id });
    } else {
      warn(`Robot PUT failed: HTTP ${resp.status}  ${JSON.stringify(resp.data).slice(0, 120)}`);
      results.skipped.push({ type: 'Robot', reason: `HTTP ${resp.status}` });
    }
  }
}

// ── View ───────────────────────────────────────────────────────────────────────
const viewPipeline = JSON.parse(readFileSync(SOURCES.view, 'utf-8'));

if (matchedViews.length === 0) {
  warn('No existing view matched "sitescan" — skipping view deploy');
  results.skipped.push({
    type: 'View',
    reason: 'No match found',
    action: 'Create in Composer UI → re-run deploy',
  });
} else {
  for (const view of matchedViews) {
    info(`Deploying view "${view.name}" [${view.id}] …`);
    // Merge pipeline into existing data.query (Microshare View data shape varies; set both paths)
    const existingData = view.data || {};
    const payload = {
      name:    view.name,
      desc:    view.desc || '',
      recType: view.recType,
      tags:    view.tags || [],
      data:    {
        ...existingData,
        query:  { pipeline: viewPipeline },
        // Some Composer versions use data.pipeline directly
        pipeline: viewPipeline,
      },
      id: view.id,
    };
    const resp = await request(`${DAPI}/view/${view.recType}/${view.id}`, {
      method:  'PUT',
      headers: authHeader(TOKEN),
      body:    JSON.stringify(payload),
    });
    if (resp.ok) {
      ok(`View deployed  →  ${DAPI}/view/${view.recType}/${view.id}`);
      results.deployed.push({ type: 'View', name: view.name, id: view.id, recType: view.recType });
    } else {
      warn(`View PUT failed: HTTP ${resp.status}  ${JSON.stringify(resp.data).slice(0, 120)}`);
      results.skipped.push({ type: 'View', reason: `HTTP ${resp.status}` });
    }
  }
}

// ── Form ───────────────────────────────────────────────────────────────────────
const formHtml = readFileSync(SOURCES.form, 'utf-8');

if (matchedForms.length === 0) {
  warn('No existing form matched "sitescan" — skipping form deploy');
  results.skipped.push({
    type: 'Form',
    reason: 'No match found',
    action: 'Create in Composer UI → re-run deploy',
  });
} else {
  for (const form of matchedForms) {
    info(`Deploying form "${form.name}" [${form.id}] …`);
    const existingData = form.data || {};
    const payload = {
      name:    form.name,
      desc:    form.desc || '',
      recType: 'form',
      tags:    form.tags || [],
      data:    { ...existingData, form: formHtml },
      id:      form.id,
    };
    // Forms always use /form/form/{id}
    const resp = await request(`${DAPI}/form/form/${form.id}`, {
      method:  'PUT',
      headers: authHeader(TOKEN),
      body:    JSON.stringify(payload),
    });
    if (resp.ok) {
      ok(`Form deployed  →  ${DAPI}/form/form/${form.id}`);
      results.deployed.push({ type: 'Form', name: form.name, id: form.id });
    } else {
      warn(`Form PUT failed: HTTP ${resp.status}  ${JSON.stringify(resp.data).slice(0, 120)}`);
      results.skipped.push({ type: 'Form', reason: `HTTP ${resp.status}` });
    }
  }
}

// ── App Facts ─────────────────────────────────────────────────────────────────
const appFacts = JSON.parse(readFileSync(SOURCES.app, 'utf-8'));

if (matchedApps.length === 0) {
  warn('No existing app matched "sitescan" — skipping app facts deploy');
  results.skipped.push({
    type: 'App',
    reason: 'No match found',
    action: 'Create in Composer UI → re-run deploy',
  });
} else {
  for (const app of matchedApps) {
    info(`Deploying app facts for "${app.name}" [${app.id}] …`);
    const payload = {
      name:    app.name,
      desc:    app.desc || '',
      recType: 'Display',
      tags:    app.tags || [],
      data:    { ...app.data, facts: appFacts },
      id:      app.id,
    };
    const resp = await request(`${DAPI}/app/Display/${app.id}`, {
      method:  'PUT',
      headers: authHeader(TOKEN),
      body:    JSON.stringify(payload),
    });
    if (resp.ok) {
      ok(`App facts deployed  →  ${DAPI}/app/Display/${app.id}`);
      results.deployed.push({ type: 'App', name: app.name, id: app.id });
    } else {
      warn(`App PUT failed: HTTP ${resp.status}  ${JSON.stringify(resp.data).slice(0, 120)}`);
      results.skipped.push({ type: 'App', reason: `HTTP ${resp.status}` });
    }
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
box('Summary');

if (results.deployed.length) {
  log('\nDeployed:');
  results.deployed.forEach(r => ok(`${r.type}: "${r.name}"  [id: ${r.id}]`));
}

if (results.skipped.length) {
  log('\nNeeds manual step in Composer UI:');
  results.skipped.forEach(r => {
    warn(`${r.type} — ${r.reason}`);
    if (r.action) info(r.action);
  });
}

// Output IDs of deployed Views so user can paste into App Facts
const deployedViews = results.deployed.filter(r => r.type === 'View');
if (deployedViews.length) {
  log('\n──────────────────────────────────────────────────────────────');
  log('Paste these into your App "Facts to Display" JSON:');
  deployedViews.forEach(v => {
    log(`  "uplinkViewRecType": "${v.recType}",`);
    log(`  "uplinkViewId":      "${v.id}",`);
  });
  log('──────────────────────────────────────────────────────────────');
}

if (results.skipped.length === 0) {
  log('\nAll objects deployed. Open the App URL on your phone to test.');
} else {
  log('\nCreate the missing objects in Composer UI (see DEPLOY.md), then re-run:');
  log(`  node deploy.mjs --env ${ENV}`);
}
