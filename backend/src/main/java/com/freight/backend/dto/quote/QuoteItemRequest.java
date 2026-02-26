package com.freight.backend.dto.quote;

public class QuoteItemRequest {
    private String itemName;
    private String itemType;
    private String itemDescription;
    private Integer quantity;
    private Integer lengthCm;
    private Integer widthCm;
    private Integer heightCm;
    private Double unitWeightKg;
    private Double unitVolumeCbm;
    private Boolean fragile;
    private Boolean upright;
    private Boolean noStack;
    private Boolean bottomOnly;
    private Boolean rotatable;
    private Boolean stackable;
    private Double maxStackWeightKg;
    private String handlingTags;
    private Integer sortOrder;

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }
    public String getItemDescription() { return itemDescription; }
    public void setItemDescription(String itemDescription) { this.itemDescription = itemDescription; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public Integer getLengthCm() { return lengthCm; }
    public void setLengthCm(Integer lengthCm) { this.lengthCm = lengthCm; }
    public Integer getWidthCm() { return widthCm; }
    public void setWidthCm(Integer widthCm) { this.widthCm = widthCm; }
    public Integer getHeightCm() { return heightCm; }
    public void setHeightCm(Integer heightCm) { this.heightCm = heightCm; }
    public Double getUnitWeightKg() { return unitWeightKg; }
    public void setUnitWeightKg(Double unitWeightKg) { this.unitWeightKg = unitWeightKg; }
    public Double getUnitVolumeCbm() { return unitVolumeCbm; }
    public void setUnitVolumeCbm(Double unitVolumeCbm) { this.unitVolumeCbm = unitVolumeCbm; }
    public Boolean getFragile() { return fragile; }
    public void setFragile(Boolean fragile) { this.fragile = fragile; }
    public Boolean getUpright() { return upright; }
    public void setUpright(Boolean upright) { this.upright = upright; }
    public Boolean getNoStack() { return noStack; }
    public void setNoStack(Boolean noStack) { this.noStack = noStack; }
    public Boolean getBottomOnly() { return bottomOnly; }
    public void setBottomOnly(Boolean bottomOnly) { this.bottomOnly = bottomOnly; }
    public Boolean getRotatable() { return rotatable; }
    public void setRotatable(Boolean rotatable) { this.rotatable = rotatable; }
    public Boolean getStackable() { return stackable; }
    public void setStackable(Boolean stackable) { this.stackable = stackable; }
    public Double getMaxStackWeightKg() { return maxStackWeightKg; }
    public void setMaxStackWeightKg(Double maxStackWeightKg) { this.maxStackWeightKg = maxStackWeightKg; }
    public String getHandlingTags() { return handlingTags; }
    public void setHandlingTags(String handlingTags) { this.handlingTags = handlingTags; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
