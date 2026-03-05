# Driver Photo Upload — Troubleshooting

업로드 시 `NETWORK_ERROR` 또는 `Failed to fetch` 오류가 발생할 때 체크리스트.

---

## 1. Dev Client 재빌드 필수

`cleartext(Android)` 및 `ATS(iOS)` 허용은 **네이티브 AndroidManifest / Info.plist 수정**이므로
OTA(Over-the-Air) 업데이트로는 적용되지 않는다.

**설정 변경 후 반드시 재빌드:**

```bash
# Android
expo run:android

# iOS
expo run:ios

# EAS Build
eas build --profile development --platform android
eas build --profile development --platform ios
```

> Expo Go 앱에는 이 설정이 적용되지 않는다. Dev Client(커스텀 빌드)를 사용할 것.

---

## 2. Android Emulator — localhost 접근 불가

Android 에뮬레이터에서 `localhost` 또는 `127.0.0.1`은 **에뮬레이터 자체**를 가리킨다.
개발 서버가 호스트(PC)에서 실행 중이라면 아래와 같이 설정해야 한다.

`.env` 파일:

```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080
```

> `10.0.2.2`는 Android Emulator에서 호스트 PC를 가리키는 예약 alias다.

---

## 3. 같은 Wi-Fi / 서버 실행 확인

실제 기기에서 테스트할 때:

- 기기와 개발 PC가 **같은 Wi-Fi 네트워크**에 있어야 한다.
- `EXPO_PUBLIC_API_BASE_URL`을 개발 PC의 **로컬 IP**(예: `http://192.168.10.37:8080`)로 설정한다.
- 서버가 실행 중인지 확인하고, 방화벽이 해당 포트를 차단하지 않는지 확인한다.

---

## 4. HTTP Cleartext 차단 확인

Android 9(API 28)+는 기본적으로 HTTP 평문 요청을 차단한다.
iOS도 ATS(App Transport Security)가 `http://`를 차단한다.

`plugins/withDevNetworkOverrides.ts`가 `APP_ENV !== "production"` 시 이를 자동으로 허용한다.
재빌드 후에도 오류가 계속되면 빌드 로그에서 `usesCleartextTraffic` / `NSAllowsArbitraryLoads` 적용 여부를 확인한다.

---

## 5. Timeout — 임시 보강, 향후 이미지 압축 필요

현재 파일 업로드 요청에는 60초 timeout이 적용되어 있다(`custom-instance.ts`).

기본 20초보다 여유 있게 설정했지만, 이것은 **임시 보강**이다.

**TODO**: 업로드 전 이미지 리사이즈/압축(예: `expo-image-manipulator`)을 적용하여
파일 크기를 줄이고 업로드 시간을 단축할 것.

---

## 6. Production에서 HTTP 금지

`APP_ENV=production` 환경에서는 `withDevNetworkOverrides` 플러그인이 아무것도 수정하지 않는다.
프로덕션 서버는 반드시 **HTTPS** 를 사용해야 한다.

production 빌드에서 `http://` baseURL을 사용하면 앱 실행 시 콘솔 경고가 출력된다(`env.ts`).

---

## 7. 진단 흐름 — Alert 내용 해석

업로드 실패 시 앱이 자동으로 `GET /api/driver/matches/{matchId}/photos`를 호출해 네트워크 상태를 진단한다.

| Alert 내용 | 원인 |
|---|---|
| "서버는 응답하지만 업로드에 실패" | 이미지 크기/timeout 문제 |
| "네트워크 또는 ATS/Cleartext 차단" | cleartext 미허용 또는 네트워크 단절 |
| "서버 주소·포트 확인" | baseURL 설정 오류 |

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `plugins/withDevNetworkOverrides.ts` | AndroidManifest/Info.plist 수정 Config Plugin |
| `app.config.ts` | Expo 빌드 설정 (SoT, app.json 보다 우선 적용) |
| `src/shared/lib/config/env.ts` | API baseURL 구성 및 경고 |
| `src/shared/api/orval/custom-instance.ts` | axios 공통 인스턴스 (FormData timeout 60s) |
| `src/features/driver-run/ui/RunActiveDetails.tsx` | 업로드 UX 및 진단 로직 |
