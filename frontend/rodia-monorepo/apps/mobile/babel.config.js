module.exports = function (api) {
  // 트랜스파일 결과를 캐시하여 반복 빌드 속도를 향상시킨다.
  api.cache(true);

  return {
    // babel-preset-expo: React Native 트랜스파일, JSX 변환, expo-router 라우팅
    // 변환 등 Expo 생태계에 필요한 모든 Babel 플러그인을 통합 제공한다.
    // expo-router/babel은 expo-router 3.x부터 이 프리셋 내부로 통합되어
    // 별도 추가가 불필요하며, 명시적으로 추가하면 "Cannot find module" 오류가 발생한다.
    presets: ["babel-preset-expo"],

    plugins: [
      [
        // module-resolver: "@/..." 형태의 절대 경로 alias를 런타임 이전에
        // 실제 상대 경로로 치환한다. TypeScript의 paths와 달리 번들 빌드에도
        // 적용되므로 반드시 Babel 레벨에서 선언해야 한다.
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
          // metro.config.js의 sourceExts와 동일한 순서로 정렬.
          // .mjs/.cjs를 앞에 두어 ESM-first 패키지(three 등)의 진입점이
          // module-resolver 단계에서도 올바르게 해석되도록 한다.
          extensions: [".mjs", ".cjs", ".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
    ],
  };
};
