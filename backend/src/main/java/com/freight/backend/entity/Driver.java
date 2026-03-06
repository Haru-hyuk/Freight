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
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "drivers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "driver_id")
    private Long driverId;

    @Column(name = "email")
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "name")
    private String name;

    @Column(name = "phone")
    private String phone;

    @Column(name = "address")
    private String address;

    @Column(name = "address_detail")
    private String addressDetail;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "bank_account")
    private String bankAccount;

    @Column(name = "selected_truck_id")
    private Long selectedTruckId;

    @Column(name = "license_verified", nullable = false)
    private Boolean licenseVerified;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "on_duty", nullable = false)
    @Builder.Default
    private Boolean onDuty = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null || status.isBlank()) {
            status = "ACTIVE";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void updateStatus(String status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public void reviewApproval(boolean approved, String nextStatus) {
        this.licenseVerified = approved;
        if (nextStatus != null && !nextStatus.isBlank()) {
            this.status = nextStatus;
        }
        this.updatedAt = LocalDateTime.now();
    }

    public void selectTruck(Long truckId) {
        this.selectedTruckId = truckId;
        this.updatedAt = LocalDateTime.now();
    }

    public void clearSelectedTruck() {
        this.selectedTruckId = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateOnDuty(boolean onDuty) {
        this.onDuty = onDuty;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateProfile(String nextName, String nextEmail, String nextPhone) {
        if (nextName != null && !nextName.isBlank()) {
            this.name = nextName.trim();
        }
        if (nextEmail != null && !nextEmail.isBlank()) {
            this.email = nextEmail.trim();
        }
        if (nextPhone != null && !nextPhone.isBlank()) {
            this.phone = nextPhone.trim();
        }
        this.updatedAt = LocalDateTime.now();
    }
}
