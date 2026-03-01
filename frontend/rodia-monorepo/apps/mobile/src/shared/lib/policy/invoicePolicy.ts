import {
  CUSTOMER_UI_STATE,
  INVOICE_UI_STATE,
  type CustomerUiState,
  type InvoiceUiState,
} from "./types";

/**
 * 세금계산서 정책 (화주 상태 기준)
 * - 입력: `CustomerUiState`
 * - 출력: 계산서 화면 상태 / 발행 가능 / 다운로드 가능 여부
 */
const INVOICE_UI_STATE_MAP: Readonly<Record<CustomerUiState, InvoiceUiState>> = {
  [CUSTOMER_UI_STATE.REQUESTED]: INVOICE_UI_STATE.PENDING,
  [CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED]: INVOICE_UI_STATE.PENDING,
  [CUSTOMER_UI_STATE.PAYMENT_REQUIRED]: INVOICE_UI_STATE.PENDING,
  [CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS]: INVOICE_UI_STATE.PENDING,
  [CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS]: INVOICE_UI_STATE.PENDING,
  [CUSTOMER_UI_STATE.COMPLETED]: INVOICE_UI_STATE.ISSUED,
  [CUSTOMER_UI_STATE.CANCELED]: INVOICE_UI_STATE.UNAVAILABLE,
  [CUSTOMER_UI_STATE.UNKNOWN]: INVOICE_UI_STATE.UNAVAILABLE,
};

export function getInvoiceUiState(uiState: CustomerUiState): InvoiceUiState {
  return INVOICE_UI_STATE_MAP[uiState] ?? INVOICE_UI_STATE.UNAVAILABLE;
}

// 완료(COMPLETED) 상태에서만 발행 가능
export function canIssueInvoice(uiState: CustomerUiState): boolean {
  return uiState === CUSTOMER_UI_STATE.COMPLETED;
}

// 발행 상태(ISSUED)일 때만 다운로드 가능
export function canDownloadInvoice(uiState: CustomerUiState): boolean {
  return getInvoiceUiState(uiState) === INVOICE_UI_STATE.ISSUED;
}
