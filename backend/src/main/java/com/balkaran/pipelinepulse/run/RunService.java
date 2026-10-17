package com.balkaran.pipelinepulse.run;

import java.util.UUID;

import com.balkaran.pipelinepulse.common.ResourceNotFoundException;

import org.springframework.stereotype.Service;

@Service
public class RunService {

    private final RunRepository repository;

    public RunService(RunRepository repository) {
        this.repository = repository;
    }

    public Run create(String pipelineId, CreateRunRequest request) {
        return repository.create(
                UUID.randomUUID().toString(),
                pipelineId,
                request.triggeredBy().strip(),
                request.commitSha().strip()
        ).orElseThrow(() ->
                new ResourceNotFoundException(
                        "Pipeline not found: " + pipelineId
                )
        );
    }
}