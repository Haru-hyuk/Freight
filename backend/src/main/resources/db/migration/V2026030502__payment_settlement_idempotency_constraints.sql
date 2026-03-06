-- 결제/정산 멱등성 강화
-- 1) 기존 중복 데이터 최소 정리
-- 2) payments.order_no / payments.pg_ref / settlements.match_id UNIQUE 보장

-- order_no 중복 정리: 가장 작은 payment_id만 유지, 나머지는 order_no를 안전하게 변형
UPDATE payments p
JOIN (
    SELECT order_no, MIN(payment_id) AS keep_id
    FROM payments
    WHERE order_no IS NOT NULL AND TRIM(order_no) <> ''
    GROUP BY order_no
    HAVING COUNT(*) > 1
) dup ON dup.order_no = p.order_no
SET p.order_no = CONCAT(p.order_no, '-DUP-', p.payment_id)
WHERE p.payment_id <> dup.keep_id;

-- pg_ref 중복 정리: 가장 작은 payment_id만 유지, 나머지는 NULL 처리
UPDATE payments p
JOIN (
    SELECT pg_ref, MIN(payment_id) AS keep_id
    FROM payments
    WHERE pg_ref IS NOT NULL AND TRIM(pg_ref) <> ''
    GROUP BY pg_ref
    HAVING COUNT(*) > 1
) dup ON dup.pg_ref = p.pg_ref
SET p.pg_ref = NULL
WHERE p.payment_id <> dup.keep_id;

-- settlements.match_id 중복 정리: 가장 작은 settlement_id만 유지
DELETE s
FROM settlements s
JOIN (
    SELECT match_id, MIN(settlement_id) AS keep_id
    FROM settlements
    GROUP BY match_id
    HAVING COUNT(*) > 1
) dup ON dup.match_id = s.match_id
WHERE s.settlement_id <> dup.keep_id;

-- payments.order_no UNIQUE 인덱스
SET @uk_payments_order_no_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'payments'
      AND non_unique = 0
      AND index_name = 'uk_payments_order_no'
);
SET @sql_uk_payments_order_no = IF(
    @uk_payments_order_no_exists = 0,
    'CREATE UNIQUE INDEX uk_payments_order_no ON payments (order_no)',
    'SELECT 1'
);
PREPARE stmt_uk_payments_order_no FROM @sql_uk_payments_order_no;
EXECUTE stmt_uk_payments_order_no;
DEALLOCATE PREPARE stmt_uk_payments_order_no;

-- payments.pg_ref UNIQUE 인덱스
SET @uk_payments_pg_ref_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'payments'
      AND non_unique = 0
      AND index_name = 'uk_payments_pg_ref'
);
SET @sql_uk_payments_pg_ref = IF(
    @uk_payments_pg_ref_exists = 0,
    'CREATE UNIQUE INDEX uk_payments_pg_ref ON payments (pg_ref)',
    'SELECT 1'
);
PREPARE stmt_uk_payments_pg_ref FROM @sql_uk_payments_pg_ref;
EXECUTE stmt_uk_payments_pg_ref;
DEALLOCATE PREPARE stmt_uk_payments_pg_ref;

-- settlements.match_id UNIQUE 인덱스
SET @uk_settlements_match_id_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'settlements'
      AND non_unique = 0
      AND index_name = 'uk_settlements_match_id'
);
SET @sql_uk_settlements_match_id = IF(
    @uk_settlements_match_id_exists = 0,
    'CREATE UNIQUE INDEX uk_settlements_match_id ON settlements (match_id)',
    'SELECT 1'
);
PREPARE stmt_uk_settlements_match_id FROM @sql_uk_settlements_match_id;
EXECUTE stmt_uk_settlements_match_id;
DEALLOCATE PREPARE stmt_uk_settlements_match_id;
