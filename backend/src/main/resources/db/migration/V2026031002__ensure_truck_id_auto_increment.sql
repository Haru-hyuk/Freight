-- Ensure legacy trucks.truck_id is AUTO_INCREMENT on environments that missed V2.
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
