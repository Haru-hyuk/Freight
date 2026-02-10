package com.freight.backend.controller;

import com.freight.backend.dto.truck.TruckCreateRequest;
import com.freight.backend.dto.truck.TruckCreateResponse;
import com.freight.backend.dto.truck.TruckResponse;
import com.freight.backend.dto.truck.TruckUpdateRequest;
import com.freight.backend.service.TruckService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/driver/trucks")
@RequiredArgsConstructor
public class TruckController {

    private final TruckService truckService;

    @PostMapping
    public ResponseEntity<TruckCreateResponse> createTruck(@RequestBody TruckCreateRequest req) {
        return ResponseEntity.ok(truckService.createTruck(req));
    }

    @GetMapping
    public ResponseEntity<List<TruckResponse>> listTrucks() {
        return ResponseEntity.ok(truckService.listTrucks());
    }

    @GetMapping("/{truckId}")
    public ResponseEntity<TruckResponse> getTruck(@PathVariable Long truckId) {
        return ResponseEntity.ok(truckService.getTruck(truckId));
    }

    @PutMapping("/{truckId}")
    public ResponseEntity<TruckResponse> updateTruck(
            @PathVariable Long truckId,
            @RequestBody TruckUpdateRequest req
    ) {
        return ResponseEntity.ok(truckService.updateTruck(truckId, req));
    }

    @DeleteMapping("/{truckId}")
    public ResponseEntity<Void> deleteTruck(@PathVariable Long truckId) {
        truckService.deleteTruck(truckId);
        return ResponseEntity.noContent().build();
    }
}
