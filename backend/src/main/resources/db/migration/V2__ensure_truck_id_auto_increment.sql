-- 트럭 등록 실패(400 DataIntegrityViolation) 방지:
-- 레거시 스키마에서 truck_id가 AUTO_INCREMENT가 아닐 수 있으므로 기동 시 보정한다.

SET @truck_auto = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'trucks'
      AND column_name = 'truck_id'
      AND LOWER(extra) LIKE '%auto_increment%'
);

SET @sql_truck_auto = IF(
    @truck_auto = 0,
    'ALTER TABLE trucks MODIFY COLUMN truck_id BIGINT NOT NULL AUTO_INCREMENT',
    'SELECT 1'
);

PREPARE stmt_truck_auto FROM @sql_truck_auto;
EXECUTE stmt_truck_auto;
DEALLOCATE PREPARE stmt_truck_auto;
