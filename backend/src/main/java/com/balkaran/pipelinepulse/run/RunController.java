package com.balkaran.pipelinepulse.run;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PatchMapping;


@RestController
public class RunController {

    private final RunService service;

    public RunController(RunService service) {
        this.service = service;
    }
    @GetMapping("/pipelines/{pipelineId}/runs")
    public RunPage findByPipeline(
            @PathVariable("pipelineId") String pipelineId,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "limit", defaultValue = "20") int limit,
            @RequestParam(name = "cursor", required = false) String cursor
    ) {
        return service.findByPipeline(pipelineId, status, limit, cursor);
    }

    @GetMapping("/runs/{id}")
    public RunDetails findById(@PathVariable("id") String id) {
        return service.findById(id);
    }

    @PostMapping("/pipelines/{pipelineId}/runs")
    public ResponseEntity<Run> create(
            @PathVariable("pipelineId") String pipelineId,
            @Valid @RequestBody CreateRunRequest request
    ) {
        Run run = service.create(pipelineId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(run);
    }

    @PatchMapping("/runs/{id}")
    public Run updateStatus(
            @PathVariable("id") String id,
            @Valid @RequestBody UpdateRunRequest request
    ) {
        return service.updateStatus(id, request);
    }
}