package com.freight.backend.gpsload.loadplan.api;

import com.freight.backend.gpsload.loadplan.model.LoadPlanRequest;
import com.freight.backend.gpsload.loadplan.model.LoadPlanResponse;
import com.freight.backend.gpsload.loadplan.model.LoadPlanSavedResponse;
import com.freight.backend.gpsload.loadplan.service.LoadPlanService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/load")
public class LoadPlanController {

    private final LoadPlanService loadPlanService;

    public LoadPlanController(LoadPlanService loadPlanService) {
        this.loadPlanService = loadPlanService;
    }

    @PostMapping(value = "/plan", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public LoadPlanResponse plan(@RequestBody LoadPlanRequest request) {
        return loadPlanService.plan(request);
    }

    @PostMapping(value = "/plan/confirm", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public LoadPlanSavedResponse confirm(@RequestBody LoadPlanRequest request) {
        return loadPlanService.planAndSave(request);
    }
}
