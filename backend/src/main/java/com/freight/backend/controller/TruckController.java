package com.freight.backend.controller;

import com.freight.backend.dto.truck.TruckCreateRequest;
import com.freight.backend.dto.truck.TruckCreateResponse;
import com.freight.backend.dto.truck.TruckResponse;
import com.freight.backend.dto.truck.TruckUpdateRequest;
import com.freight.backend.service.TruckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/driver/trucks")
@RequiredArgsConstructor
@Tag(name = "Truck", description = "기사 차량 관리 API")
public class TruckController {

    private final TruckService truckService;

    @Operation(summary = "차량 등록")
    @ApiResponse(
            responseCode = "200",
            description = "등록된 차량 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TruckCreateResponse.class)
            )
    )
    @PostMapping
    public ResponseEntity<TruckCreateResponse> createTruck(@Valid @RequestBody TruckCreateRequest req) {
        return ResponseEntity.ok(truckService.createTruck(req));
    }

    @Operation(summary = "내 차량 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "차량 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = TruckResponse.class))
            )
    )
    @GetMapping
    public ResponseEntity<List<TruckResponse>> listTrucks() {
        return ResponseEntity.ok(truckService.listTrucks());
    }

    @Operation(summary = "현재 활성 차량 조회")
    @ApiResponse(
            responseCode = "200",
            description = "활성 차량 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TruckResponse.class)
            )
    )
    @GetMapping("/active")
    public ResponseEntity<TruckResponse> getActiveTruck() {
        return ResponseEntity.ok(truckService.getActiveTruck());
    }

    @Operation(summary = "활성 차량 선택")
    @ApiResponse(
            responseCode = "200",
            description = "선택된 활성 차량 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TruckResponse.class)
            )
    )
    @PatchMapping("/active/{truckId}")
    public ResponseEntity<TruckResponse> selectActiveTruck(@PathVariable Long truckId) {
        return ResponseEntity.ok(truckService.selectActiveTruck(truckId));
    }

    @Operation(summary = "차량 상세 조회")
    @ApiResponse(
            responseCode = "200",
            description = "차량 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TruckResponse.class)
            )
    )
    @GetMapping("/{truckId}")
    public ResponseEntity<TruckResponse> getTruck(@PathVariable Long truckId) {
        return ResponseEntity.ok(truckService.getTruck(truckId));
    }

    @Operation(summary = "차량 정보 수정")
    @ApiResponse(
            responseCode = "200",
            description = "수정된 차량 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TruckResponse.class)
            )
    )
    @PutMapping("/{truckId}")
    public ResponseEntity<TruckResponse> updateTruck(
            @PathVariable Long truckId,
            @Valid @RequestBody TruckUpdateRequest req
    ) {
        return ResponseEntity.ok(truckService.updateTruck(truckId, req));
    }

    @Operation(summary = "차량 삭제")
    @ApiResponse(responseCode = "204", description = "삭제 완료")
    @DeleteMapping("/{truckId}")
    public ResponseEntity<Void> deleteTruck(@PathVariable Long truckId) {
        truckService.deleteTruck(truckId);
        return ResponseEntity.noContent().build();
    }
}
