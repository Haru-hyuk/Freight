export const TOAST = {
  saved: "저장되었습니다.",
  saveFail: "저장에 실패했습니다.",
  networkError: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  unauthorized: "세션이 만료되었습니다. 다시 로그인해 주세요.",
  forbidden: "권한이 없습니다.",
  notFound: "요청한 정보를 찾을 수 없습니다.",
  conflict: "이미 처리된 요청입니다.",
  validation: "입력값을 확인해 주세요.",
  serverError: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  unknownError: "처리 중 오류가 발생했습니다.",
  photoGateRequired: "인증 사진 확인 후 진행할 수 있습니다.",
} as const;
