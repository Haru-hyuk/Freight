import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import {
  acceptShipperCounterOffer,
  rejectShipperCounterOffer,
} from "@/features/counter-offer/api";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InitiatePaymentParams = {
  quoteId: number;
  matchId?: number;
  status?: string;
  backendStatus?: string;
  uiState?: string;
};

export type UseMatchingActionsResult = {
  /** 현재 수락 API 진행 중인지 여부 */
  isAccepting: boolean;
  /** 현재 거절 API 진행 중인지 여부 */
  isRejecting: boolean;
  /** 수락 또는 거절 중 하나라도 진행 중이면 true */
  isLoading: boolean;
  /**
   * 기사님의 역제안을 수락합니다.
   * - counterOfferId > 0: Alert 확인 후 API 호출 → onSuccess 실행
   * - counterOfferId <= 0: 상세 페이지로 폴백 (onSuccess 즉시 실행)
   * - 이중 호출 방지(isBusyRef)로 멱등성 확보
   */
  acceptProposal: (counterOfferId: number, onSuccess?: () => void) => void;
  /**
   * 기사님의 역제안을 거절합니다.
   * - counterOfferId > 0: Alert 확인 후 API 호출 → onSuccess 실행
   * - counterOfferId <= 0: onSuccess 즉시 실행(폴백)
   */
  rejectProposal: (counterOfferId: number, onSuccess?: () => void) => void;
  /**
   * 결제 페이지로 이동합니다.
   */
  initiatePayment: (params: InitiatePaymentParams) => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMatchingActions(): UseMatchingActionsResult {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  /**
   * isBusyRef: Alert가 떠 있거나 API가 진행 중일 때 추가 동작 차단.
   * state가 아닌 ref를 쓰는 이유: Alert.alert의 onPress 콜백은 React 렌더 사이클 밖에서
   * 실행되므로, state 업데이트 전에 중복 호출이 들어올 수 있기 때문.
   */
  const isBusyRef = useRef(false);

  const acceptProposal = useCallback(
    (counterOfferId: number, onSuccess?: () => void) => {
      if (isBusyRef.current) return;

      // counterOfferId가 없으면 상세 페이지에서 처리하도록 폴백
      if (counterOfferId <= 0) {
        onSuccess?.();
        return;
      }

      // Alert를 띄우기 직전 잠금 → 이중 탭 방지
      isBusyRef.current = true;

      Alert.alert(
        "제안 수락",
        "기사님의 운임 제안을 수락하시겠습니까?\n수락 후 결제 단계로 이동합니다.",
        [
          {
            text: "취소",
            style: "cancel",
            onPress: () => {
              // 취소 시 잠금 해제
              isBusyRef.current = false;
            },
          },
          {
            text: "수락하기",
            style: "default",
            onPress: async () => {
              setIsAccepting(true);
              try {
                await acceptShipperCounterOffer(counterOfferId);
                onSuccess?.();
              } catch (e) {
                const msg = readApiErrorMessage(e, "제안 수락에 실패했습니다. 잠시 후 다시 시도해 주세요.");
                Alert.alert("수락 실패", msg);
              } finally {
                setIsAccepting(false);
                isBusyRef.current = false;
              }
            },
          },
        ],
        { cancelable: false }
      );
    },
    []
  );

  const rejectProposal = useCallback(
    (counterOfferId: number, onSuccess?: () => void) => {
      if (isBusyRef.current) return;

      if (counterOfferId <= 0) {
        onSuccess?.();
        return;
      }

      isBusyRef.current = true;

      Alert.alert(
        "제안 거절",
        "기사님의 운임 제안을 거절하시겠습니까?",
        [
          {
            text: "취소",
            style: "cancel",
            onPress: () => {
              isBusyRef.current = false;
            },
          },
          {
            text: "거절하기",
            style: "destructive",
            onPress: async () => {
              setIsRejecting(true);
              try {
                await rejectShipperCounterOffer(counterOfferId);
                onSuccess?.();
              } catch (e) {
                const msg = readApiErrorMessage(e, "제안 거절에 실패했습니다. 잠시 후 다시 시도해 주세요.");
                Alert.alert("거절 실패", msg);
              } finally {
                setIsRejecting(false);
                isBusyRef.current = false;
              }
            },
          },
        ],
        { cancelable: false }
      );
    },
    []
  );

  const initiatePayment = useCallback(
    ({ quoteId, matchId, status, backendStatus, uiState }: InitiatePaymentParams) => {
      router.push({
        pathname: "/(shipper)/quotes/[id]",
        params: {
          id: String(quoteId),
          status: status ?? "",
          action: "PAY",
          matchId: matchId ? String(matchId) : undefined,
          backendStatus: backendStatus ?? "",
          uiState: uiState ?? "",
        },
      } as any);
    },
    []
  );

  return {
    isAccepting,
    isRejecting,
    isLoading: isAccepting || isRejecting,
    acceptProposal,
    rejectProposal,
    initiatePayment,
  };
}
