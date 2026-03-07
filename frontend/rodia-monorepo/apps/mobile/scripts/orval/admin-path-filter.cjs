// apps/mobile/scripts/orval/admin-path-filter.cjs
//
// Orval input.override.transformer 용 이중 방어 필터.
// fix-openapi-pathparams.mjs 에서 이미 제거되었지만,
// 혹시 openapi.fixed.json 을 수동으로 교체하거나
// ORVAL_OPENAPI_URL 을 직접 지정할 때도 admin 경로가
// 코드로 생성되지 않도록 Orval 파싱 단계에서 한 번 더 차단한다.
//
// Orval v8: input.override.transformer 는 CommonJS 파일 경로를 받는다.
// 이 파일은 (spec: OpenAPIObject) => OpenAPIObject 시그니처의 함수를 export 해야 한다.

/**
 * @param {import('@orval/core').OpenAPIObject} spec
 * @returns {import('@orval/core').OpenAPIObject}
 */
function removeAdminPaths(spec) {
  if (!spec || typeof spec.paths !== "object") return spec;

  const filteredPaths = Object.fromEntries(
    Object.entries(spec.paths).filter(
      ([routePath]) => !routePath.startsWith("/api/admin")
    )
  );

  return { ...spec, paths: filteredPaths };
}

module.exports = removeAdminPaths;
