package com.balkaran.pipelinepulse.run;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RunController {

    private final RunService service;

    public RunController(RunService service) {
        this.service = service;
    }

    @PostMapping("/pipelines/{pipelineId}/runs")
    public ResponseEntity<Run> create(
            @PathVariable("pipelineId") String pipelineId,
            @Valid @RequestBody CreateRunRequest request
    ) {
        Run run = service.create(pipelineId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(run);
    }
}