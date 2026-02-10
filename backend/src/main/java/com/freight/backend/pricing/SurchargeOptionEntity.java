package com.freight.backend.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "surcharge_options")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SurchargeOptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "surcharge_option_id")
    private Long id;

    @Column(name = "code", unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_type")
    private SurchargeOptionType optionType;

    @Column(name = "min_add_won")
    private BigDecimal minAddWon;

    @Column(name = "max_add_won")
    private BigDecimal maxAddWon;

    @Column(name = "min_multiplier")
    private BigDecimal minMultiplier;

    @Column(name = "max_multiplier")
    private BigDecimal maxMultiplier;

    @Column(name = "fixed_add_won")
    private BigDecimal fixedAddWon;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (enabled == null) {
            enabled = Boolean.TRUE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
