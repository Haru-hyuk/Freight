package com.freight.backend.gpsload.loadplan.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "load_plans")
public class LoadPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Long planId;

    @Column(name = "truck_id")
    private Long truckId;

    @Column(name = "utilization", nullable = false)
    private Double utilization;

    @Column(name = "total_weight", nullable = false)
    private Double totalWeight;

    @Column(name = "placed_count", nullable = false)
    private Integer placedCount;

    @Column(name = "unplaced_count", nullable = false)
    private Integer unplacedCount;

    @Column(name = "violations", nullable = false)
    private Integer violations;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LoadPlanItem> items = new ArrayList<>();

    protected LoadPlan() {
    }

    public LoadPlan(Long truckId, Double utilization, Double totalWeight, Integer placedCount, Integer unplacedCount, Integer violations, LocalDateTime createdAt) {
        this.truckId = truckId;
        this.utilization = utilization;
        this.totalWeight = totalWeight;
        this.placedCount = placedCount;
        this.unplacedCount = unplacedCount;
        this.violations = violations;
        this.createdAt = createdAt;
    }

    public void addItem(LoadPlanItem item) {
        item.setPlan(this);
        this.items.add(item);
    }

    public Long getPlanId() {
        return planId;
    }

    public Long getTruckId() {
        return truckId;
    }

    public Double getUtilization() {
        return utilization;
    }

    public Double getTotalWeight() {
        return totalWeight;
    }

    public Integer getPlacedCount() {
        return placedCount;
    }

    public Integer getUnplacedCount() {
        return unplacedCount;
    }

    public Integer getViolations() {
        return violations;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public List<LoadPlanItem> getItems() {
        return items;
    }
}
