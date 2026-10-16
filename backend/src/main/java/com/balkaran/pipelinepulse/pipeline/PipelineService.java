package com.balkaran.pipelinepulse.pipeline;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class PipelineService {

    private final PipelineRepository repository;

    public PipelineService(PipelineRepository repository) {
        this.repository = repository;
    }

    public List<Pipeline> findAll() {
        return repository.findAll();
    }

    public Pipeline create(CreatePipelineRequest request) {
        return repository.create(
                UUID.randomUUID().toString(),
                request.name().strip(),
                request.product()
        );
    }
}