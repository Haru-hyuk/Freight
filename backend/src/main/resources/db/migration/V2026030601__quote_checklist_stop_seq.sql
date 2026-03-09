-- quote_checklist_items에 경유지/도착지 단위 체크리스트 매핑을 위한 stop_seq 추가
SET @schema_name := DATABASE();

SET @has_stop_seq_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'quote_checklist_items'
      AND COLUMN_NAME = 'stop_seq'
);
SET @ddl_add_stop_seq := IF(
    @has_stop_seq_col = 0,
    'ALTER TABLE quote_checklist_items ADD COLUMN stop_seq INT NULL AFTER extra_input',
    'SELECT 1'
);
PREPARE stmt_add_stop_seq FROM @ddl_add_stop_seq;
EXECUTE stmt_add_stop_seq;
DEALLOCATE PREPARE stmt_add_stop_seq;

SET @has_quote_stop_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'quote_checklist_items'
      AND INDEX_NAME = 'idx_quote_checklist_items_quote_stop'
);
SET @ddl_add_quote_stop_idx := IF(
    @has_quote_stop_idx = 0,
    'CREATE INDEX idx_quote_checklist_items_quote_stop ON quote_checklist_items (quote_id, stop_seq)',
    'SELECT 1'
);
PREPARE stmt_add_quote_stop_idx FROM @ddl_add_quote_stop_idx;
EXECUTE stmt_add_quote_stop_idx;
DEALLOCATE PREPARE stmt_add_quote_stop_idx;
