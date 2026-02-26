// apps/mobile/scripts/orval/fix-openapi-path-params.mjs
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

// 1) .env.local first, then .env (local should win)
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

// Examples:
// ORVAL_OPENAPI_SOURCE=http://localhost:8080/api-docs
// ORVAL_OPENAPI_SOURCE=http://10.0.2.2:8080/api-docs
// ORVAL_OPENAPI_SOURCE=http://15.x.x.x:8080/api-docs

const DEFAULT_SOURCE =
  process.env.ORVAL_OPENAPI_SOURCE ||
  process.env.OPENAPI_SOURCE ||
  "http://localhost:8080/api-docs";

const CWD = process.cwd(); // expected: apps/mobile
const ORVAL_DIR = path.resolve(CWD, ".orval");

const RAW_PATH =
  process.env.ORVAL_OPENAPI_RAW_PATH ??
  path.resolve(ORVAL_DIR, "openapi.raw.json");
const FIXED_PATH =
  process.env.ORVAL_OPENAPI_FIXED_PATH ??
  path.resolve(ORVAL_DIR, "openapi.fixed.json");

const FETCH_TIMEOUT_MS = Number(process.env.ORVAL_FETCH_TIMEOUT_MS ?? 10000);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function safeReadJson(filePath) {
  const txt = fs.readFileSync(filePath, "utf8");
  return JSON.parse(txt);
}

function safeWriteJson(filePath, json) {
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n", "utf8");
}

function extractPathParams(openapiPath) {
  // e.g. "/api/shipper/quotes/{quoteId}/stops/{stopId}" -> ["quoteId","stopId"]
  const matches = openapiPath.matchAll(/\{([^}]+)\}/g);
  const params = [];
  for (const m of matches) {
    const name = (m?.[1] ?? "").trim();
    if (name) params.push(name);
  }
  return params;
}

function toParamSchema(existingSchema) {
  // keep existing schema if provided, else default to string
  if (existingSchema && typeof existingSchema === "object") return existingSchema;
  return { type: "string" };
}

function normalizeParametersArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function hasParam(params, name) {
  return normalizeParametersArray(params).some(
    (p) => p?.in === "path" && p?.name === name
  );
}

function addMissingPathParamsToOperation(operation, paramNames, fallbackSchema) {
  if (!operation || typeof operation !== "object") return 0;

  const opParams = normalizeParametersArray(operation.parameters);
  let added = 0;

  for (const name of paramNames) {
    if (hasParam(opParams, name)) continue;

    opParams.push({
      name,
      in: "path",
      required: true,
      schema: toParamSchema(fallbackSchema),
    });
    added += 1;
  }

  operation.parameters = opParams;
  return added;
}

function fixOpenApiPathParams(openapiJson) {
  const paths = openapiJson?.paths ?? {};
  if (!paths || typeof paths !== "object") return { fixed: openapiJson, added: 0 };

  const HTTP_METHODS = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
    "trace",
  ];

  let addedTotal = 0;

  for (const [p, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    const paramNames = extractPathParams(p);
    if (paramNames.length === 0) continue;

    // If pathItem.parameters already defines a schema for some params, reuse schema when adding to ops.
    const pathLevelParams = normalizeParametersArray(pathItem?.parameters);
    const schemaByName = new Map();
    for (const pp of pathLevelParams) {
      const name = pp?.name;
      if (pp?.in === "path" && typeof name === "string" && name) {
        schemaByName.set(name, pp?.schema);
      }
    }

    for (const m of HTTP_METHODS) {
      const op = pathItem?.[m];
      if (!op) continue;

      for (const name of paramNames) {
        const schema = schemaByName.get(name);
        addedTotal += addMissingPathParamsToOperation(op, [name], schema);
      }
    }
  }

  return { fixed: openapiJson, added: addedTotal };
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res?.ok) throw new Error(`HTTP ${res?.status} ${res?.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  ensureDir(ORVAL_DIR);

  console.log(`[orval:fetch] source=${DEFAULT_SOURCE}`);
  console.log(`[orval:fetch] raw=${RAW_PATH}`);
  console.log(`[orval:fetch] fixed=${FIXED_PATH}`);

  let rawJson = null;

  // 1) Try fetch -> raw
  try {
    rawJson = await fetchJsonWithTimeout(DEFAULT_SOURCE, FETCH_TIMEOUT_MS);
    safeWriteJson(RAW_PATH, rawJson);
  } catch (e) {
    const msg = e?.message ?? String(e);
    const hasCache = fs.existsSync(RAW_PATH);

    console.log(`[orval:fetch] fetch failed: ${msg}`);
    if (!hasCache) {
      console.error(
        `[orval:fetch] no cached raw spec found at ${RAW_PATH}. Start backend or set ORVAL_OPENAPI_SOURCE, then retry.`
      );
      process.exit(1);
    }

    console.log(`[orval:fetch] using cached raw spec: ${RAW_PATH}`);
    try {
      rawJson = safeReadJson(RAW_PATH);
    } catch (readErr) {
      const rmsg = readErr?.message ?? String(readErr);
      console.error(`[orval:fetch] cached raw parse failed: ${rmsg}`);
      process.exit(1);
    }
  }

  // 2) raw -> fixed (always attempt)
  const { fixed, added } = fixOpenApiPathParams(rawJson ?? {});
  safeWriteJson(FIXED_PATH, fixed);

  console.log(`[orval:fetch] added Path Params=${added}`);
}

main().catch((e) => {
  const msg = e?.message ?? String(e);
  console.error(`[orval:fetch] fatal: ${msg}`);
  process.exit(1);
});
