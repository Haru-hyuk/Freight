package com.freight.backend.gpsmiss.routeassembly.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity(name = "RouteAssemblyQuoteItem")
@Table(name = "quote_items")
public class QuoteItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quote_item_id")
    private Long quoteItemId;

    @Column(name = "quote_id", nullable = false)
    private Long quoteId;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "length_cm")
    private Integer lengthCm;

    @Column(name = "width_cm")
    private Integer widthCm;

    @Column(name = "height_cm")
    private Integer heightCm;

    @Column(name = "unit_weight_kg")
    private Double unitWeightKg;

    @Column(name = "fragile")
    private Boolean fragile;

    @Column(name = "upright")
    private Boolean upright;

    @Column(name = "stackable")
    private Boolean stackable;

    @Column(name = "rotatable")
    private Boolean rotatable;

    @Column(name = "no_stack")
    private Boolean noStack;

    @Column(name = "bottom_only")
    private Boolean bottomOnly;

    @Column(name = "max_stack_weight_kg")
    private Double maxStackWeight;

    @Column(name = "handling_tags")
    private String handlingTags;

    @Column(name = "sort_order")
    private Integer sortOrder;

    protected QuoteItemEntity() {
    }

    public Long getQuoteItemId() {
        return quoteItemId;
    }

    public Long getItemId() {
        return quoteItemId;
    }

    public Long getQuoteId() {
        return quoteId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public Integer getLengthCm() {
        return lengthCm;
    }

    public Integer getWidthCm() {
        return widthCm;
    }

    public Integer getHeightCm() {
        return heightCm;
    }

    public Double getWeightKg() {
        return unitWeightKg;
    }

    public Double getUnitWeightKg() {
        return unitWeightKg;
    }

    public Boolean getFragile() {
        return fragile;
    }

    public Boolean getUpright() {
        return upright;
    }

    public Boolean getStackable() {
        return stackable;
    }

    public Boolean getRotatable() {
        return rotatable;
    }

    public Boolean getNoStack() {
        return noStack;
    }

    public Boolean getBottomOnly() {
        return bottomOnly;
    }

    public Double getMaxStackWeight() {
        return maxStackWeight;
    }

    public String getHandlingTags() {
        return handlingTags;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }
}
