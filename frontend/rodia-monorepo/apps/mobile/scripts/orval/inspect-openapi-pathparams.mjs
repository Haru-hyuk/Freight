import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const inputArg = process.argv[2];
const inputPath = inputArg
  ? path.resolve(process.cwd(), inputArg)
  : path.resolve(MOBILE_ROOT, ".orval/openapi.raw.json");

function operationLabel(method, operation) {
  const opId = operation?.operationId;
  if (typeof opId === "string" && opId.trim()) return opId.trim();
  return `${method.toUpperCase()}(no-operationId)`;
}

try {
  const raw = fs.readFileSync(inputPath, "utf8");
  const spec = JSON.parse(raw);
  const paths = spec?.paths ?? {};

  console.log(`[inspect] input=${inputPath}`);

  const interestingPaths = Object.keys(paths).filter((p) => /\{[^}]+\}/.test(p));
  if (interestingPaths.length === 0) {
    console.log("[inspect] no paths containing template params were found");
  }

  const methods = ["get", "put", "post", "delete", "patch", "options", "head", "trace"];

  for (const template of interestingPaths) {
    const pathItem = paths[template] ?? {};
    const pathParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
    const templateParams = [...template.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);

    console.log(`\n[path] ${template}`);
    const pathParamPairs = pathParams.map((p) => `${String(p?.name ?? "")}:${String(p?.in ?? "")}`);
    console.log(`[path-parameters] ${pathParamPairs.length ? pathParamPairs.join(", ") : "(none)"}`);

    for (const method of methods) {
      const operation = pathItem?.[method];
      if (!operation) continue;

      const opParams = Array.isArray(operation.parameters) ? operation.parameters : [];
      const merged = [...pathParams, ...opParams];
      const opParamPairs = opParams.map((p) => `${String(p?.name ?? "")}:${String(p?.in ?? "")}`);
      console.log(`  [op] ${method.toUpperCase()} ${operationLabel(method, operation)}`);
      console.log(`  [op-parameters] ${opParamPairs.length ? opParamPairs.join(", ") : "(none)"}`);

      for (const templateParam of templateParams) {
        const hasPathParam = merged.some(
          (p) => String(p?.name ?? "") === templateParam && String(p?.in ?? "") === "path"
        );
        console.log(`  [${templateParam}:path] ${hasPathParam ? "OK" : "MISSING"}`);
        if (!hasPathParam) {
          console.log(`  MISSING path param ${templateParam} for ${method.toUpperCase()} ${template}`);
        }
      }
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[inspect] failed: ${message}`);
}

process.exit(0);
