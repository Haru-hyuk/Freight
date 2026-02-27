package com.freight.backend.dto.shipper;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ShipperAddressItemResponse {

    private String id;
    private String label;
    @JsonProperty("isDefault")
    private boolean isDefault;
    private String address;
    private String addressDetail;
    private String memo;
}
