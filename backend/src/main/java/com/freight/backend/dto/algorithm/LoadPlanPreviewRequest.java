package com.freight.backend.dto.algorithm;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoadPlanPreviewRequest {
    private Long truckId;

    @NotEmpty
    private List<Long> quoteIds;
}

