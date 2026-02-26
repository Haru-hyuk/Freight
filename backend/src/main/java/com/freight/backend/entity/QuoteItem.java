package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "quote_items")
public class QuoteItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quote_item_id")
    private Long quoteItemId;

    @Column(name = "quote_id", nullable = false)
    private Long quoteId;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "item_type")
    private String itemType;

    @Column(name = "item_description")
    private String itemDescription;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "length_cm")
    private Integer lengthCm;

    @Column(name = "width_cm")
    private Integer widthCm;

    @Column(name = "height_cm")
    private Integer heightCm;

    @Column(name = "unit_weight_kg")
    private Double unitWeightKg;

    @Column(name = "weight_kg")
    private Double weightKg;

    @Column(name = "unit_volume_cbm")
    private Double unitVolumeCbm;

    @Column(name = "fragile", nullable = false)
    private Boolean fragile;

    @Column(name = "upright", nullable = false)
    private Boolean upright;

    @Column(name = "no_stack", nullable = false)
    private Boolean noStack;

    @Column(name = "bottom_only", nullable = false)
    private Boolean bottomOnly;

    @Column(name = "rotatable", nullable = false)
    private Boolean rotatable;

    @Column(name = "stackable", nullable = false)
    private Boolean stackable;

    @Column(name = "max_stack_weight_kg")
    private Double maxStackWeightKg;

    @Column(name = "handling_tags")
    private String handlingTags;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public QuoteItem() {
    }

    public static Builder builder() {
        return new Builder();
    }

    public Long getQuoteItemId() { return quoteItemId; }
    public Long getQuoteId() { return quoteId; }
    public String getItemName() { return itemName; }
    public String getItemType() { return itemType; }
    public String getItemDescription() { return itemDescription; }
    public Integer getQuantity() { return quantity; }
    public Integer getLengthCm() { return lengthCm; }
    public Integer getWidthCm() { return widthCm; }
    public Integer getHeightCm() { return heightCm; }
    public Double getUnitWeightKg() { return unitWeightKg; }
    public Double getWeightKg() { return weightKg; }
    public Double getUnitVolumeCbm() { return unitVolumeCbm; }
    public Boolean getFragile() { return fragile; }
    public Boolean getUpright() { return upright; }
    public Boolean getNoStack() { return noStack; }
    public Boolean getBottomOnly() { return bottomOnly; }
    public Boolean getRotatable() { return rotatable; }
    public Boolean getStackable() { return stackable; }
    public Double getMaxStackWeightKg() { return maxStackWeightKg; }
    public String getHandlingTags() { return handlingTags; }
    public Integer getSortOrder() { return sortOrder; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (quantity == null || quantity <= 0) quantity = 1;
        if (fragile == null) fragile = Boolean.FALSE;
        if (upright == null) upright = Boolean.FALSE;
        if (noStack == null) noStack = Boolean.FALSE;
        if (bottomOnly == null) bottomOnly = Boolean.FALSE;
        if (rotatable == null) rotatable = Boolean.TRUE;
        if (stackable == null) stackable = Boolean.TRUE;
        if (sortOrder == null) sortOrder = 0;
        if (weightKg == null) {
            if (unitWeightKg != null && unitWeightKg > 0) {
                weightKg = unitWeightKg * quantity;
            } else {
                weightKg = 0.0;
            }
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (quantity == null || quantity <= 0) quantity = 1;
        if (weightKg == null) {
            if (unitWeightKg != null && unitWeightKg > 0) {
                weightKg = unitWeightKg * quantity;
            } else {
                weightKg = 0.0;
            }
        }
    }

    public static class Builder {
        private final QuoteItem target = new QuoteItem();

        public Builder quoteId(Long quoteId) { target.quoteId = quoteId; return this; }
        public Builder itemName(String itemName) { target.itemName = itemName; return this; }
        public Builder itemType(String itemType) { target.itemType = itemType; return this; }
        public Builder itemDescription(String itemDescription) { target.itemDescription = itemDescription; return this; }
        public Builder quantity(Integer quantity) { target.quantity = quantity; return this; }
        public Builder lengthCm(Integer lengthCm) { target.lengthCm = lengthCm; return this; }
        public Builder widthCm(Integer widthCm) { target.widthCm = widthCm; return this; }
        public Builder heightCm(Integer heightCm) { target.heightCm = heightCm; return this; }
        public Builder unitWeightKg(Double unitWeightKg) { target.unitWeightKg = unitWeightKg; return this; }
        public Builder weightKg(Double weightKg) { target.weightKg = weightKg; return this; }
        public Builder unitVolumeCbm(Double unitVolumeCbm) { target.unitVolumeCbm = unitVolumeCbm; return this; }
        public Builder fragile(Boolean fragile) { target.fragile = fragile; return this; }
        public Builder upright(Boolean upright) { target.upright = upright; return this; }
        public Builder noStack(Boolean noStack) { target.noStack = noStack; return this; }
        public Builder bottomOnly(Boolean bottomOnly) { target.bottomOnly = bottomOnly; return this; }
        public Builder rotatable(Boolean rotatable) { target.rotatable = rotatable; return this; }
        public Builder stackable(Boolean stackable) { target.stackable = stackable; return this; }
        public Builder maxStackWeightKg(Double maxStackWeightKg) { target.maxStackWeightKg = maxStackWeightKg; return this; }
        public Builder handlingTags(String handlingTags) { target.handlingTags = handlingTags; return this; }
        public Builder sortOrder(Integer sortOrder) { target.sortOrder = sortOrder; return this; }
        public QuoteItem build() { return target; }
    }
}
