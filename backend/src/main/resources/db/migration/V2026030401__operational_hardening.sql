-- 운영 안정화 마이그레이션
-- 1) trucks.truck_id 자동 증가 보장
-- 2) 관리자/알림 조회 인덱스 보강

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

SET @idx_trucks_approval = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'trucks'
      AND index_name = 'idx_trucks_approval_status_created_at'
);
SET @sql_idx_trucks_approval = IF(
    @idx_trucks_approval = 0,
    'CREATE INDEX idx_trucks_approval_status_created_at ON trucks (approval_status, created_at)',
    'SELECT 1'
);
PREPARE stmt_idx_trucks_approval FROM @sql_idx_trucks_approval;
EXECUTE stmt_idx_trucks_approval;
DEALLOCATE PREPARE stmt_idx_trucks_approval;

SET @idx_notifications_receiver = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'notifications'
      AND index_name = 'idx_notifications_receiver_type_receiver_id_created_at'
);
SET @sql_idx_notifications_receiver = IF(
    @idx_notifications_receiver = 0,
    'CREATE INDEX idx_notifications_receiver_type_receiver_id_created_at ON notifications (receiver_type, receiver_id, created_at)',
    'SELECT 1'
);
PREPARE stmt_idx_notifications_receiver FROM @sql_idx_notifications_receiver;
EXECUTE stmt_idx_notifications_receiver;
DEALLOCATE PREPARE stmt_idx_notifications_receiver;

SET @idx_sanctions_created = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'sanction_events'
      AND index_name = 'idx_sanction_events_created_at'
);
SET @sql_idx_sanctions_created = IF(
    @idx_sanctions_created = 0,
    'CREATE INDEX idx_sanction_events_created_at ON sanction_events (created_at)',
    'SELECT 1'
);
PREPARE stmt_idx_sanctions_created FROM @sql_idx_sanctions_created;
EXECUTE stmt_idx_sanctions_created;
DEALLOCATE PREPARE stmt_idx_sanctions_created;

SET @idx_settlements_driver_status = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'settlements'
      AND index_name = 'idx_settlements_driver_status_created_at'
);
SET @sql_idx_settlements_driver_status = IF(
    @idx_settlements_driver_status = 0,
    'CREATE INDEX idx_settlements_driver_status_created_at ON settlements (driver_id, settlement_status, created_at)',
    'SELECT 1'
);
PREPARE stmt_idx_settlements_driver_status FROM @sql_idx_settlements_driver_status;
EXECUTE stmt_idx_settlements_driver_status;
DEALLOCATE PREPARE stmt_idx_settlements_driver_status;
