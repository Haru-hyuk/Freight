package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "checklist_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "checklist_item_id")
    private Long checklistItemId;

    @Column(name = "category")
    private String category;

    @Column(name = "name")
    private String name;

    @Column(name = "icon")
    private String icon;

    @Column(name = "has_extra_fee", nullable = false)
    private Boolean hasExtraFee;

    @Column(name = "base_extra_fee", nullable = false)
    private BigDecimal baseExtraFee;

    @Column(name = "requires_extra_input", nullable = false)
    private Boolean requiresExtraInput;

    @Column(name = "extra_input_label")
    private String extraInputLabel;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (enabled == null) {
            enabled = Boolean.TRUE;
        }
        if (hasExtraFee == null) {
            hasExtraFee = Boolean.FALSE;
        }
        if (requiresExtraInput == null) {
            requiresExtraInput = Boolean.FALSE;
        }
        if (baseExtraFee == null) {
            baseExtraFee = BigDecimal.ZERO;
        }
    }
}
