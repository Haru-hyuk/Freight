// rodia-monorepo/apps/mobile/orval.config.js
const path = require("node:path");

const OPENAPI_URL =
  process.env.ORVAL_OPENAPI_URL ||
  "./.orval/openapi.fixed.json";

module.exports = {
  "freight-api": {
    input: {
      target: OPENAPI_URL,

      // 1차 방어: admin- 접두사 태그를 가진 operation 전체 제외.
      // fix-openapi-pathparams.mjs 가 openapi.fixed.json 에서 이미
      // /api/admin/* 경로를 제거하지만, ORVAL_OPENAPI_URL 로 raw spec을
      // 직접 지정하는 경우에도 admin 코드가 생성되지 않도록 태그 레벨에서 필터링한다.
      filters: {
        tags: [/^(?!admin-)/i],
      },

      override: {
        // 2차 방어: spec 파싱 직후 /api/admin/* 경로를 한 번 더 제거.
        // Inquiry 처럼 모바일·어드민이 같은 태그를 공유하는 엔드포인트도
        // 경로 레벨에서 차단하여 불필요한 코드가 전혀 생성되지 않도록 한다.
        transformer: "./scripts/orval/admin-path-filter.cjs",
      },
    },
    output: {
      // 생성 파일이 모일 베이스 폴더 (index.ts 자동 생성)
      workspace: "./src/shared/api/generated",
      // tags-split 기준 "타겟 파일명" + 태그별 폴더가 함께 생성됨
      target: "./freight.ts",
      schemas: "./schemas",

      // 재생성 전 기존 파일을 모두 삭제하여 삭제된 admin 폴더가 잔존하지 않도록 한다.
      clean: true,

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
