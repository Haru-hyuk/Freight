package com.freight.backend.dto.quote;

public class QuoteItemResponse {
    private final Long quoteItemId;
    private final String itemName;
    private final String itemType;
    private final String itemDescription;
    private final Integer quantity;
    private final Integer lengthCm;
    private final Integer widthCm;
    private final Integer heightCm;
    private final Double unitWeightKg;
    private final Double unitVolumeCbm;
    private final Boolean fragile;
    private final Boolean upright;
    private final Boolean noStack;
    private final Boolean bottomOnly;
    private final Boolean rotatable;
    private final Boolean stackable;
    private final Double maxStackWeightKg;
    private final String handlingTags;
    private final Integer sortOrder;

    public QuoteItemResponse(Long quoteItemId, String itemName, String itemType, String itemDescription, Integer quantity,
                             Integer lengthCm, Integer widthCm, Integer heightCm, Double unitWeightKg, Double unitVolumeCbm,
                             Boolean fragile, Boolean upright, Boolean noStack, Boolean bottomOnly, Boolean rotatable,
                             Boolean stackable, Double maxStackWeightKg, String handlingTags, Integer sortOrder) {
        this.quoteItemId = quoteItemId;
        this.itemName = itemName;
        this.itemType = itemType;
        this.itemDescription = itemDescription;
        this.quantity = quantity;
        this.lengthCm = lengthCm;
        this.widthCm = widthCm;
        this.heightCm = heightCm;
        this.unitWeightKg = unitWeightKg;
        this.unitVolumeCbm = unitVolumeCbm;
        this.fragile = fragile;
        this.upright = upright;
        this.noStack = noStack;
        this.bottomOnly = bottomOnly;
        this.rotatable = rotatable;
        this.stackable = stackable;
        this.maxStackWeightKg = maxStackWeightKg;
        this.handlingTags = handlingTags;
        this.sortOrder = sortOrder;
    }

    public Long getQuoteItemId() { return quoteItemId; }
    public String getItemName() { return itemName; }
    public String getItemType() { return itemType; }
    public String getItemDescription() { return itemDescription; }
    public Integer getQuantity() { return quantity; }
    public Integer getLengthCm() { return lengthCm; }
    public Integer getWidthCm() { return widthCm; }
    public Integer getHeightCm() { return heightCm; }
    public Double getUnitWeightKg() { return unitWeightKg; }
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
}
