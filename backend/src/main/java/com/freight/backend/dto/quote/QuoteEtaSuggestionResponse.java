package com.freight.backend.dto.quote;

import java.time.LocalDateTime;

public record QuoteEtaSuggestionResponse(
        LocalDateTime pickupScheduleStart,
        Integer distanceKm,
        Integer estimatedTravelSeconds,
        Integer handlingBufferSeconds,
        LocalDateTime proposedDeliveryDeadline
) {
}
