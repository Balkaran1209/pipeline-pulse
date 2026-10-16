package com.balkaran.pipelinepulse.pipeline;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@RestController
@RequestMapping("/pipelines")
public class PipelineController {

    private final PipelineService service;

    public PipelineController(PipelineService service) {
        this.service = service;
    }

    @GetMapping
    public List<Pipeline> findAll() {
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<Pipeline> create(
            @Valid @RequestBody CreatePipelineRequest request,
            @RequestHeader(
                    name = "Idempotency-Key",
                    required = false
            ) String idempotencyKey
    ) {
        Pipeline pipeline = service.create(request, idempotencyKey);

        return ResponseEntity.status(HttpStatus.CREATED).body(pipeline);
    }

    @GetMapping("/{id}")
    public Pipeline findById(@PathVariable("id") String id) {
        return service.findById(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable("id") String id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}")
    public Pipeline update(
            @PathVariable("id") String id,
            @RequestBody Map<String, Object> body
    ) {
        UpdatePipelineRequest request = UpdatePipelineRequest.from(body);
        return service.update(id, request);
    }
}