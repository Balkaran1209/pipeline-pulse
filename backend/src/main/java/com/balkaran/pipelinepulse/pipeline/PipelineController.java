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
            @Valid @RequestBody CreatePipelineRequest request
    ) {
        Pipeline pipeline = service.create(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pipeline);
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
}