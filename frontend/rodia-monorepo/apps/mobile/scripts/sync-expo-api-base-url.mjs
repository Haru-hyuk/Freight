// apps/mobile/scripts/sync-expo-api-base-url.mjs
// Usage (recommended): pnpm -C apps/mobile node scripts/sync-expo-api-base-url.mjs
// Optional: add --with-orval to also set ORVAL_OPENAPI_SOURCE/OPENAPI_SOURCE in .env.local

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);
const withOrval = argv.includes("--with-orval");

const PROJECT_ROOT = process.cwd(); // run from apps/mobile (e.g., pnpm -C apps/mobile ...)
const ENV_LOCAL_PATH = path.resolve(PROJECT_ROOT, ".env.local");

const API_SCHEME = process.env.EXPO_PUBLIC_API_SCHEME || "http";
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "8080";
const API_DOCS_PATH = process.env.ORVAL_OPENAPI_PATH || "/api-docs";

function isIpv4(value) {
  return typeof value === "string" && value.split(".").length === 4;
}

function isPrivateIpv4(ip) {
  if (!isIpv4(ip)) return false;
  const [a, b] = ip.split(".").map((v) => Number(v));
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function scorePrivateIpv4(ip) {
  if (!isPrivateIpv4(ip)) return 0;
  if (ip.startsWith("192.168.")) return 3;
  if (ip.startsWith("10.")) return 2;
  if (ip.startsWith("172.")) return 1;
  return 0;
}

function pickBestLocalIpv4() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    const addrs = nets[name] || [];
    for (const addr of addrs) {
      if (!addr || addr.family !== "IPv4" || addr.internal) continue;
      if (!addr.address) continue;
      candidates.push(addr.address);
    }
  }

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestScore = scorePrivateIpv4(best);

  for (const ip of candidates.slice(1)) {
    const s = scorePrivateIpv4(ip);
    if (s > bestScore) {
      best = ip;
      bestScore = s;
    }
  }

  return best;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertEnv(lines, key, value) {
  const keyRe = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`);
  const next = [];
  let replaced = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith("#") && keyRe.test(line)) {
      next.push(`${key}=${value}`);
      replaced = true;
    } else {
      next.push(line);
    }
  }

  if (!replaced) {
    if (next.length > 0 && next[next.length - 1].trim() !== "") next.push("");
    next.push(`${key}=${value}`);
  }

  return next;
}

const ip = pickBestLocalIpv4();
if (!ip) {
  console.error(
    "[sync-expo-api-base-url] No external IPv4 address found. Set EXPO_PUBLIC_API_BASE_URL manually in .env.local."
  );
  process.exit(1);
}

const baseUrl = `${API_SCHEME}://${ip}:${API_PORT}`;
const openapiSource = `${API_SCHEME}://${ip}:${API_PORT}${API_DOCS_PATH.startsWith("/") ? "" : "/"}${API_DOCS_PATH}`;

const existing = fs.existsSync(ENV_LOCAL_PATH)
  ? fs.readFileSync(ENV_LOCAL_PATH, "utf8")
  : "";
const lines = existing.split(/\r?\n/);

let nextLines = upsertEnv(lines, "EXPO_PUBLIC_API_BASE_URL", baseUrl);

if (withOrval) {
  nextLines = upsertEnv(nextLines, "ORVAL_OPENAPI_SOURCE", openapiSource);
  nextLines = upsertEnv(nextLines, "OPENAPI_SOURCE", openapiSource);
}

const output = `${nextLines.join("\n").replace(/\s+$/g, "")}\n`;
fs.writeFileSync(ENV_LOCAL_PATH, output, "utf8");

console.log(
  `[sync-expo-api-base-url] .env.local updated: EXPO_PUBLIC_API_BASE_URL=${baseUrl}`
);
if (withOrval) {
  console.log(
    `[sync-expo-api-base-url] .env.local updated: ORVAL_OPENAPI_SOURCE=${openapiSource} (and OPENAPI_SOURCE)`
  );
}
