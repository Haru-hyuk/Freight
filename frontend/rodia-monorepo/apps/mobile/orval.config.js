// rodia-monorepo/apps/mobile/orval.config.js
const path = require("node:path");

const OPENAPI_URL =
  process.env.ORVAL_OPENAPI_URL ||
  "./.orval/openapi.fixed.json";

module.exports = {
  "freight-api": {
    input: {
      target: OPENAPI_URL,
    },
    output: {
      // 생성 파일이 모일 베이스 폴더 (index.ts 자동 생성)
      workspace: "./src/shared/api/generated",
      // tags-split 기준 "타겟 파일명" + 태그별 폴더가 함께 생성됨
      target: "./freight.ts",
      schemas: "./schemas",

      // 기존 axios 인스턴스(apiClient)를 쓰기 위해 mutator로 연결
      client: "axios-functions",
      mode: "tags-split",
      override: {
        mutator: {
          path: path.resolve(__dirname, "./src/shared/api/orval/custom-instance.ts"),
          name: "customInstance",
        },
      },
    },
  },
};
