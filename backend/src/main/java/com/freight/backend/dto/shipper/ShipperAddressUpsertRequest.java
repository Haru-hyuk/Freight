package com.freight.backend.dto.shipper;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShipperAddressUpsertRequest {

    @NotBlank
    @Size(max = 100)
    private String label;

    private Boolean isDefault;

    @NotBlank
    @Size(max = 255)
    private String address;

    @Size(max = 255)
    private String addressDetail;

    @Size(max = 500)
    private String memo;
}
