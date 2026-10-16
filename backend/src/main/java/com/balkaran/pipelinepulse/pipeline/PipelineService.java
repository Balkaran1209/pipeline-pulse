package com.balkaran.pipelinepulse.pipeline;

import java.util.List;
import java.util.UUID;
import com.balkaran.pipelinepulse.common.ResourceNotFoundException;

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

    public Pipeline findById(String id) {
    return repository.findById(id)
            .orElseThrow(() ->
                    new ResourceNotFoundException("Pipeline not found: " + id)
            );
    }

    public void deleteById(String id) {
        int deletedRows = repository.deleteById(id);

        if (deletedRows == 0) {
            throw new ResourceNotFoundException("Pipeline not found: " + id);
        }
    }
}