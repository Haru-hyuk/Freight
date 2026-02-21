import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";

const SOURCE_URL = process.env.ORVAL_SOURCE_OPENAPI_URL || "http://192.168.0.28:8080/api-docs";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const RAW_PATH = path.resolve(MOBILE_ROOT, ".orval/openapi.raw.json");
const FIXED_PATH = path.resolve(MOBILE_ROOT, ".orval/openapi.fixed.json");

function fetchText(url) {
  const client = url.startsWith("https://") ? https : http;
  return new Promise((resolve, reject) => {
    client
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`fetch failed: ${url} status=${res.statusCode}`));
            return;
          }
          resolve(data);
        });
      })
      .on("error", reject);
  });
}

function inferSchema(paramName) {
  if (/id$/i.test(paramName)) {
    return { type: "integer", format: "int64" };
  }
  return { type: "string" };
}

function ensurePathParam(pathItem, paramName) {
  const parameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
  const exists = parameters.some(
    (p) => p && String(p.name ?? "") === paramName && String(p.in ?? "") === "path"
  );
  if (exists) return false;

  parameters.push({
    name: paramName,
    in: "path",
    required: true,
    schema: inferSchema(paramName),
  });

  pathItem.parameters = parameters;
  return true;
}

async function main() {
  const rawText = await fetchText(SOURCE_URL);

  fs.mkdirSync(path.dirname(RAW_PATH), { recursive: true });
  fs.writeFileSync(RAW_PATH, rawText, "utf8");

  const spec = JSON.parse(rawText);
  const paths = spec?.paths ?? {};
  let added = 0;

  for (const [template, pathItem] of Object.entries(paths)) {
    const matches = [...template.matchAll(/\{([^}]+)\}/g)];
    if (!matches.length) continue;

    if (!pathItem || typeof pathItem !== "object") continue;
    for (const match of matches) {
      const paramName = match[1];
      if (ensurePathParam(pathItem, paramName)) {
        added += 1;
      }
    }
  }

  fs.writeFileSync(FIXED_PATH, JSON.stringify(spec, null, 2), "utf8");

  console.log(`[orval:fetch] source=${SOURCE_URL}`);
  console.log(`[orval:fetch] raw=${RAW_PATH}`);
  console.log(`[orval:fetch] fixed=${FIXED_PATH}`);
  console.log(`[orval:fetch] addedPathParams=${added}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[orval:fetch] failed: ${message}`);
  process.exit(1);
});
