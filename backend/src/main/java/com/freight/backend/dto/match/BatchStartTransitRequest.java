package com.freight.backend.dto.match;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BatchStartTransitRequest {

    @NotEmpty(message = "matchIds is required")
    private List<@NotNull Long> matchIds;
}
