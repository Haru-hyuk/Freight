const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// ─── 경로 정의 ─────────────────────────────────────────────────────────────
const projectRoot = __dirname; // apps/mobile
const workspaceRoot = path.resolve(projectRoot, "../.."); // 모노레포 루트

const config = getDefaultConfig(projectRoot);

// ─── 1. 감시 범위 ─────────────────────────────────────────────────────────────
// 모노레포 루트 전체를 Hot-Reload 감시 대상에 포함.
config.watchFolders = [workspaceRoot];

// ─── 2. blockList ─────────────────────────────────────────────────────────────
// [주의] "dist", "build", "coverage" 같은 일반 디렉토리명을 패턴에 추가하면
// node_modules 안의 동명 디렉토리도 함께 차단된다.
// 예: /[/\\]build[/\\]/ → expo-router/build/qualified-entry.js 차단 → 번들링 실패.
//
// 도트파일 디렉토리(.git, .expo)만 안전하게 차단한다.
// 이 패턴들은 npm 패키지 내부에 절대 존재하지 않는 이름이므로 오탐(false positive) 위험이 없다.
const additionalBlockPatterns = [
  /[/\\]\.git[/\\]/,
  /[/\\]\.expo[/\\]/,
];

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = existingBlockList
  ? [
      ...(Array.isArray(existingBlockList) ? existingBlockList : [existingBlockList]),
      ...additionalBlockPatterns,
    ]
  : additionalBlockPatterns;

// ─── 3. 모듈 해석 경로 ───────────────────────────────────────────────────────────
// 모노레포 환경에서 패키지 중복 방지를 위한 탐색 순서 강제.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// ─── 4. 심링크 지원 ──────────────────────────────────────────────────────────
// pnpm/yarn workspace 심링크를 올바르게 추적한다.
config.resolver.unstable_enableSymlinks = true;

// unstable_enablePackageExports: 명시적으로 설정하지 않는다 (Expo 기본값 위임).
//
// [오류 근거] false로 설정하면 Metro가 package.json "exports" 맵을 무시하고
// 파일을 직접 탐색한다. expo-router 6.x는 "expo-router/build/qualified-entry"
// 같은 서브경로를 exports 맵을 통해 실제 파일로 매핑하므로, false 시
// "Unable to resolve expo-router/build/qualified-entry" 번들링 오류가 발생한다.
//
// @expo/metro-config의 getDefaultConfig가 Expo SDK 버전에 맞는 기본값을
// 주입하므로 이 옵션은 덮어쓰지 않아야 한다.

// ─── 5. 소스 확장자 ─────────────────────────────────────────────────────────────
// mjs/cjs를 앞에 배치해 ESM-first 패키지(three 등)의 진입점이 올바르게 해석되도록 한다.
const defaultSourceExts = config.resolver.sourceExts ?? ["js", "jsx", "ts", "tsx", "json"];
config.resolver.sourceExts = ["mjs", "cjs", ...defaultSourceExts];

// ─── 6. Three.js 단일 인스턴스 보장 ──────────────────────────────────────────
// ESM/CJS 혼용으로 인한 Three.js 런타임 오류 방지를 위해 CJS 빌드로 강제 리다이렉트.
let THREE_CJS_PATH = null;
try {
  THREE_CJS_PATH = require.resolve("three/build/three.cjs", {
    paths: [projectRoot, workspaceRoot],
  });
} catch {
  // three 미설치 환경 — 폴백
}

const defaultResolveRequest = config.resolver.resolveRequest ?? null;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "three" && THREE_CJS_PATH) {
    return { filePath: THREE_CJS_PATH, type: "sourceFile" };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;