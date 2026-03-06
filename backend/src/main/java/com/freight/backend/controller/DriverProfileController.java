package com.freight.backend.controller;

import com.freight.backend.dto.driver.DriverOnDutyRequest;
import com.freight.backend.dto.driver.DriverOnDutyResponse;
import com.freight.backend.entity.Driver;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기사 프로필 API
 * Base path: /api/driver/me
 * 인증: JWT (Bearer), ROLE_DRIVER
 */
@RestController
@RequestMapping("/api/driver/me")
@RequiredArgsConstructor
@Tag(name = "Driver Profile", description = "기사 프로필 API")
public class DriverProfileController {

    private final DriverRepository driverRepository;

    @Operation(summary = "운행중/퇴근 상태 조회")
    @ApiResponse(
            responseCode = "200",
            description = "현재 운행 상태 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = DriverOnDutyResponse.class)
            )
    )
    @GetMapping("/on-duty")
    public ResponseEntity<DriverOnDutyResponse> getOnDutyStatus(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        return ResponseEntity.ok(DriverOnDutyResponse.builder()
                .driverId(driverId)
                .onDuty(Boolean.TRUE.equals(driver.getOnDuty()))
                .build());
    }

    @Operation(summary = "운행중/퇴근 상태 변경")
    @ApiResponse(
            responseCode = "200",
            description = "변경된 운행 상태 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = DriverOnDutyResponse.class)
            )
    )
    @PatchMapping("/on-duty")
    @Transactional
    public ResponseEntity<DriverOnDutyResponse> updateOnDutyStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody DriverOnDutyRequest request
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        driver.updateOnDuty(Boolean.TRUE.equals(request.getEnabled()));
        driverRepository.save(driver);

        return ResponseEntity.ok(DriverOnDutyResponse.builder()
                .driverId(driverId)
                .onDuty(driver.getOnDuty())
                .build());
    }
}
