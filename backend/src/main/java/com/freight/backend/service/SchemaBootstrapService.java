package com.freight.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * 레거시 스키마 드리프트를 최소한으로 보정한다.
 * - trucks.truck_id가 AUTO_INCREMENT가 아니면 트럭 등록 시 INSERT가 실패한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SchemaBootstrapService implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Value("${schema.bootstrap.ensure-truck-id-auto-increment:true}")
    private boolean ensureTruckIdAutoIncrement;

    @Override
    public void run(ApplicationArguments args) {
        if (ensureTruckIdAutoIncrement) {
            ensureTruckIdAutoIncrement();
        }
    }

    private void ensureTruckIdAutoIncrement() {
        try {
            Integer autoIncrementCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_schema = DATABASE()
                      AND table_name = 'trucks'
                      AND column_name = 'truck_id'
                      AND LOWER(extra) LIKE '%auto_increment%'
                    """,
                    Integer.class
            );
            if (autoIncrementCount != null && autoIncrementCount > 0) {
                return;
            }

            log.warn("Schema drift detected: trucks.truck_id is not AUTO_INCREMENT. Applying schema fix.");

            // quotes.truck_id FK가 걸려 있으면 컬럼 변경이 거절되므로 일시 해제 후 복구한다.
            String quotesTruckFk = jdbcTemplate.query(
                    """
                    SELECT kcu.constraint_name
                    FROM information_schema.key_column_usage kcu
                    WHERE kcu.table_schema = DATABASE()
                      AND kcu.table_name = 'quotes'
                      AND kcu.column_name = 'truck_id'
                      AND kcu.referenced_table_name = 'trucks'
                      AND kcu.referenced_column_name = 'truck_id'
                    ORDER BY kcu.constraint_name
                    LIMIT 1
                    """,
                    rs -> rs.next() ? rs.getString(1) : null
            );

            if (quotesTruckFk != null && !quotesTruckFk.isBlank()) {
                String fkName = quoteIdentifier(quotesTruckFk);
                jdbcTemplate.execute("ALTER TABLE quotes DROP FOREIGN KEY " + fkName);
                jdbcTemplate.execute("ALTER TABLE trucks MODIFY COLUMN truck_id BIGINT NOT NULL AUTO_INCREMENT");
                jdbcTemplate.execute(
                        "ALTER TABLE quotes ADD CONSTRAINT " + fkName
                                + " FOREIGN KEY (truck_id) REFERENCES trucks(truck_id)"
                );
            } else {
                jdbcTemplate.execute("ALTER TABLE trucks MODIFY COLUMN truck_id BIGINT NOT NULL AUTO_INCREMENT");
            }

            log.info("Schema fix applied: trucks.truck_id AUTO_INCREMENT enabled.");
        } catch (Exception e) {
            // 서비스 기동은 유지하되 원인을 로그로 명확히 남긴다.
            log.error("Failed to ensure trucks.truck_id AUTO_INCREMENT. Truck creation may fail.", e);
        }
    }

    private String quoteIdentifier(String rawIdentifier) {
        String trimmed = rawIdentifier == null ? "" : rawIdentifier.trim();
        if (!trimmed.matches("[A-Za-z0-9_]+")) {
            throw new IllegalArgumentException("Unsafe SQL identifier: " + rawIdentifier);
        }
        return "`" + trimmed + "`";
    }
}
