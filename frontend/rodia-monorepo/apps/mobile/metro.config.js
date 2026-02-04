// apps/mobile/metro.config.js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
// apps/mobile -> (../..) = monorepo root
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo packages 변경 감지
config.watchFolders = [workspaceRoot];

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