// apps/mobile/metro.config.js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// ✅ blockList 생성용(Expo/Metro 버전에 따라 경로가 다를 수 있어 방어적으로 처리)
function getBlockList() {
  try {
    // Metro(구버전/일부 환경)
    // eslint-disable-next-line global-require
    const exclusionList = require("metro-config/src/defaults/exclusionList");
    return exclusionList;
  } catch {
    try {
      // Metro(신버전)
      // eslint-disable-next-line global-require
      const { exclusionList } = require("metro-config");
      return exclusionList;
    } catch {
      return null;
    }
  }
}

const projectRoot = __dirname;
// apps/mobile -> (../..) = monorepo root
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo packages 변경 감지(일단 유지: 안전한 1차 개선)
config.watchFolders = [workspaceRoot];

// ✅ 1차 개선 핵심: 쓸데없는 폴더를 Metro 감시/해석에서 제외
const exclusionList = getBlockList();
if (exclusionList) {
  const sep = `\\${path.sep}`; // windows/mac 대응
  config.resolver.blockList = exclusionList([
    // git/캐시/산출물
    new RegExp(`${sep}\\.git${sep}.*`),
    new RegExp(`${sep}\\.expo${sep}.*`),
    new RegExp(`${sep}dist${sep}.*`),
    new RegExp(`${sep}build${sep}.*`),
    new RegExp(`${sep}coverage${sep}.*`),

    // node_modules 내부를 watchFolders로 잡았을 때 불필요한 스캔 방지(안전)
    new RegExp(`${sep}node_modules${sep}.*`),
  ]);
}

// 모듈 해석 경로(앱 node_modules + 루트 node_modules)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 상위 디렉토리로 node_modules 탐색 방지(모노레포에서 중복/충돌 예방)
config.resolver.disableHierarchicalLookup = true;

// pnpm/yarn workspaces 심링크 대응(환경에 따라 필요)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;

/**
 * 1차 개선 요약(안전):
 * - watchFolders는 유지하고, .git/.expo/dist/build/coverage/node_modules를 blockList로 제외해 감시 비용을 줄임
 * - 동작이 깨질 가능성을 최소화하면서 체감 속도를 먼저 개선하는 목적
 */