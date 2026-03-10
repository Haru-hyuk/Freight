````md
# Rodia Mobile 신규 환경 실행 마스터 가이드

> 이 문서는 **Expo SDK 54 / React 19 / React Native 0.81.5** 기준으로 작성되었습니다.

---

## 1. Prerequisites (사전 준비)

### 필수 도구

| 도구 | 버전 | 확인 명령어 |
|------|------|-------------|
| Node.js | 22.x LTS | `node -v` |
| pnpm | 9.x 이상 | `pnpm -v` |
| Java (JDK) | 17 | `java -version` |
| Android Studio | 최신 | SDK Manager에서 확인 |

### pnpm 설치

```bash
npm install -g pnpm
````

### Android 환경 변수 설정 (최초 1회)

`~/.bashrc` 또는 `~/.zshrc`에 추가:

```bash
# macOS
export ANDROID_HOME=$HOME/Library/Android/sdk

# Linux
export ANDROID_HOME=$HOME/Android/Sdk

# Windows: 시스템 환경 변수에서 ANDROID_HOME 직접 설정
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

설정 적용 및 확인:

```bash
source ~/.zshrc
adb devices
```

### 디렉토리 구조 이해

```text
rodia-monorepo/          ← 모노레포 루트. pnpm install은 여기서
├── apps/
│   └── mobile/          ← 모든 expo 명령어는 여기서 실행
├── packages/
│   └── design-tokens/   ← workspace 공유 패키지
└── package.json
```

> 규칙:
>
> * `pnpm install`은 **루트에서**
> * Expo 명령어는 **apps/mobile**에서
>
> 루트에서 Expo 명령어를 실행하면 config를 찾지 못해 에러가 발생합니다.

---

## 2. Environment Setup (환경 설정)

### 의존성 설치

```bash
# 반드시 모노레포 루트에서
cd rodia-monorepo
pnpm install
```

### `.env` 파일 생성

```bash
# apps/mobile 에서
cd apps/mobile
cp .env.example .env
```

`.env.example`이 없다면 직접 생성:

```bash
echo "APP_ENV=development" > .env
```

### `.env` 파일 내용

```env
# 개발 환경: APP_ENV=development
# 운영 빌드: APP_ENV=production
# 로컬에서는 절대 production으로 바꾸지 말 것
APP_ENV=development
```

### `APP_ENV=development`일 때 적용되는 값

* 앱 이름 → `Rodia (Dev)`
* 패키지명 → `com.lchae.mobile.dev`
* 운영 앱과 기기에 동시 설치 가능
* HTTP 평문 통신 허용 (로컬 API 서버 접근용)

---

## 3. Initialization (최초 1회 실행)

### 환경 자가 진단

```bash
# apps/mobile 에서
npx expo-doctor
```

문제가 있는 항목이 표시되면:

```bash
npx expo install --fix
```

> `expo install --fix`는 Expo SDK 54 기준의 호환 버전으로 자동 교정합니다.

### 네이티브 바이너리 빌드 (최초 1회 필수)

```bash
# apps/mobile 에서
npx expo run:android
```

### 왜 `expo start`가 아니라 `expo run:android`인가?

우리 프로젝트는 패키지명이 아래처럼 이원화되어 있습니다.

* 개발: `com.lchae.mobile.dev`
* 운영: `com.lchae.mobile`

이 값은 `AndroidManifest.xml`에 기록되므로, **네이티브 바이너리를 새로 빌드해야 반영됩니다.**

`expo start`만 실행하면 이전 바이너리의 패키지명으로 실행되어 다음 문제가 발생할 수 있습니다.

* 앱 설치 충돌
* 딥링크 오동작

> 이후 **JS 코드만 수정**할 때는 `expo start`로 충분합니다.
> `app.config.ts`, `android/`, `ios/` 같은 **네이티브 설정을 변경했을 때만** `run:android`를 다시 실행하세요.

---

## 4. Daily Workflow (일상적인 개발)

### 개발 서버 시작

```bash
# apps/mobile 에서
pnpm start
```

위 명령은 아래와 동일합니다.

```bash
expo start --lan
```

Expo Go로 열려면:

```bash
pnpm expo:go
```

또는 캐시 초기화 포함 명시적 실행:

```bash
npx expo start --lan -c --dev-client
```

외부 네트워크에서 접속해야 할 때만 터널을 사용합니다.

```bash
pnpm start:tunnel
```

Expo Go + 터널이 필요하면:

```bash
pnpm expo:go:tunnel
```

### `-c` 옵션은 언제 쓰나?

* 새 패키지를 설치한 직후
* `metro.config.js` / `babel.config.js` 수정 후
* `"모듈을 찾을 수 없다"` 에러가 갑자기 발생할 때
* 오전 첫 시작 시 습관적으로 붙여도 무방함

### `--dev-client`는 왜 쓰나?

`expo-dev-client`가 설치된 프로젝트에서는 Expo Go 대신,
`run:android`로 설치한 **커스텀 네이티브 빌드**에 연결하기 위해 사용합니다.

### API 타입 재생성

백엔드 스키마가 변경되었을 때:

```bash
pnpm api:gen
```

> OpenAPI fetch → Orval 코드 생성

---

## 5. Troubleshooting

### 1) `"Unable to resolve expo-router/..."` 번들링 에러

#### 1차 시도: 캐시 초기화 후 재시작

```bash
npx expo start -c
```

### 3) `ngrok tunnel took too long to connect`

기본 개발 환경에서는 터널이 필요 없습니다. 같은 Wi-Fi 또는 같은 LAN에 있다면 아래처럼 LAN 모드로 시작하세요.

```bash
pnpm start
```

터널이 꼭 필요하면 `pnpm start:tunnel`로 명시적으로 실행합니다.

#### 해결되지 않으면: `node_modules` + Expo 캐시 전체 초기화

```bash
cd rodia-monorepo

find . -name "node_modules" -not -path "*/.git/*" -prune -exec rm -rf {} +
find . -name ".expo" -prune -exec rm -rf {} +

pnpm install

cd apps/mobile
npx expo start -c
```

#### 절대 하면 안 되는 것

`metro.config.js`에서 아래 설정을 하지 마세요.

```js
unstable_enablePackageExports = false
```

이 값이 `false`이면 `expo-router`가 내부 서브경로를 resolve하지 못해 위 에러가 발생합니다.

---

### 2) `tsconfig.json` 경로 에러

```bash
# apps/mobile 에서
npx tsc --noEmit
```

에러가 `@/...` 경로라면 `tsconfig.json`의 `paths`와
`babel.config.js`의 `alias`가 일치하는지 확인합니다.

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### `babel.config.js`

```js
alias: {
  "@": "./src"
}
```

> 둘 중 하나만 바꾸면 타입은 통과해도 런타임에서 깨집니다.
> 반드시 함께 수정해야 합니다.

---

### 3) 패키지 버전 충돌이 의심될 때

```bash
npx expo-doctor
npx expo install --fix
pnpm install
```

> `expo install --fix`는 SDK 54 공식 호환 버전 매트릭스를 참조합니다.
> 버전을 손으로 추측해서 바꾸기보다 항상 이 명령을 먼저 실행하세요.

---

### 4) 기기에 앱이 두 개 깔린 것처럼 보일 때

정상입니다. 의도된 동작입니다.

| 앱 이름          | 패키지명                   | 용도        |
| ------------- | ---------------------- | --------- |
| `Rodia (Dev)` | `com.lchae.mobile.dev` | 로컬 개발 빌드  |
| `Rodia`       | `com.lchae.mobile`     | 스토어 배포 빌드 |

---

## 요약 치트시트

### 처음 셋업

```bash
cd rodia-monorepo
pnpm install

cd apps/mobile
echo "APP_ENV=development" > .env

npx expo-doctor
npx expo install --fix
npx expo run:android
```

### 매일 개발할 때

```bash
cd apps/mobile
pnpm start
```

### 뭔가 이상할 때

```bash
npx expo start -c
```
