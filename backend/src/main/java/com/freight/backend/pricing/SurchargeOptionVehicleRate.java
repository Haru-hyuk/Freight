package com.freight.backend.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "surcharge_option_vehicle_rates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SurchargeOptionVehicleRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "surcharge_option_vehicle_rate_id")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "surcharge_option_id")
    private SurchargeOptionEntity option;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Column(name = "add_won")
    private BigDecimal addWon;
}
