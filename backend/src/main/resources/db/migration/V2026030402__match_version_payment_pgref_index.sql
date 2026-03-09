-- V2026030402: Match version column + Payment pg_ref index
-- 목적: Counter Offer 레이스 컨디션 방지 (낙관적 락) + 결제 멱등성 인덱스

-- Match 테이블에 version 컬럼 추가 (낙관적 락용)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Payment 테이블에 pg_ref 인덱스 추가 (paymentKey 기반 멱등성 체크용)
CREATE INDEX IF NOT EXISTS idx_payments_pg_ref ON payments (pg_ref);
