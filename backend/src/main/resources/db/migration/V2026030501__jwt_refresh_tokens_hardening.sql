CREATE TABLE IF NOT EXISTS jwt_refresh_tokens (
    token_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_type ENUM('DRIVER','SHIPPER','ADMIN') NOT NULL,
    user_id BIGINT NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    jti VARCHAR(64) NOT NULL UNIQUE,
    issued_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    device_info VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_jwt_user (user_type, user_id),
    INDEX idx_jwt_jti (jti),
    INDEX idx_jwt_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
