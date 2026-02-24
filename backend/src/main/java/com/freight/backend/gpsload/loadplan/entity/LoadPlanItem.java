package com.freight.backend.gpsmiss.loadplan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "load_plan_items")
public class LoadPlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    @ManyToOne
    @JoinColumn(name = "plan_id", nullable = false)
    private LoadPlan plan;

    @Column(name = "cargo_id", nullable = false)
    private String cargoId;

    @Column(name = "length", nullable = false)
    private Integer length;

    @Column(name = "width", nullable = false)
    private Integer width;

    @Column(name = "height", nullable = false)
    private Integer height;

    @Column(name = "weight", nullable = false)
    private Double weight;

    @Column(name = "stop_order", nullable = false)
    private Integer stopOrder;

    @Column(name = "rotatable", nullable = false)
    private Boolean rotatable;

    @Column(name = "stackable", nullable = false)
    private Boolean stackable;

    @Column(name = "placed", nullable = false)
    private Boolean placed;

    @Column(name = "pos_x")
    private Integer posX;

    @Column(name = "pos_y")
    private Integer posY;

    @Column(name = "pos_z")
    private Integer posZ;

    @Column(name = "ori_l")
    private Integer oriL;

    @Column(name = "ori_w")
    private Integer oriW;

    @Column(name = "ori_h")
    private Integer oriH;

    protected LoadPlanItem() {
    }

    public LoadPlanItem(String cargoId, Integer length, Integer width, Integer height, Double weight, Integer stopOrder, Boolean rotatable, Boolean stackable, Boolean placed, Integer posX, Integer posY, Integer posZ, Integer oriL, Integer oriW, Integer oriH) {
        this.cargoId = cargoId;
        this.length = length;
        this.width = width;
        this.height = height;
        this.weight = weight;
        this.stopOrder = stopOrder;
        this.rotatable = rotatable;
        this.stackable = stackable;
        this.placed = placed;
        this.posX = posX;
        this.posY = posY;
        this.posZ = posZ;
        this.oriL = oriL;
        this.oriW = oriW;
        this.oriH = oriH;
    }

    public void setPlan(LoadPlan plan) {
        this.plan = plan;
    }

    public Long getItemId() {
        return itemId;
    }

    public LoadPlan getPlan() {
        return plan;
    }

    public String getCargoId() {
        return cargoId;
    }
}
