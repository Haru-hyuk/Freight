package com.freight.backend.dto.notification;

import com.freight.backend.entity.FcmToken;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FcmTokenUpsertRequest {

    @NotNull(message = "deviceType is required")
    private FcmToken.DeviceType deviceType;

    @NotBlank(message = "fcmToken is required")
    private String fcmToken;
}
