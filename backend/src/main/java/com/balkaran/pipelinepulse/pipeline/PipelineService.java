package com.balkaran.pipelinepulse.pipeline;

import java.util.List;
import java.util.UUID;
import com.balkaran.pipelinepulse.common.ResourceNotFoundException;

import org.springframework.stereotype.Service;
import com.balkaran.pipelinepulse.common.IdempotencyConflictException;
import com.balkaran.pipelinepulse.common.InvalidRequestException;

import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PipelineService {

    private final PipelineRepository repository;
    private final PipelineCreationRequestRepository creationRequests;

    public PipelineService(
            PipelineRepository repository,
            PipelineCreationRequestRepository creationRequests
    ) {
        this.repository = repository;
        this.creationRequests = creationRequests;
    }

    public List<Pipeline> findAll() {
        return repository.findAll();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Pipeline create(
            CreatePipelineRequest request,
            String idempotencyKey
    ) {
        if (idempotencyKey == null) {
            return createPipeline(request);
        }

        if (idempotencyKey.isBlank()) {
            throw new InvalidRequestException(
                    "Idempotency-Key must not be blank"
            );
        }

        creationRequests.lockKey(idempotencyKey);

        var existing = creationRequests.findByKey(idempotencyKey);

        if (existing.isPresent()) {
            var saved = existing.get();

            boolean sameInput =
                    saved.requestName().equals(request.name())
                    && saved.requestProduct().equals(request.product());

            if (!sameInput) {
                throw new IdempotencyConflictException(
                        "Idempotency-Key has already been used "
                                + "with a different request"
                );
            }

            return saved.response();
        }

        Pipeline pipeline = createPipeline(request);
        creationRequests.save(idempotencyKey, request, pipeline);

        return pipeline;
    }

    private Pipeline createPipeline(CreatePipelineRequest request) {
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

    public Pipeline update(String id, UpdatePipelineRequest request) {
    String name = request.name() == null
            ? null
            : request.name().strip();

    return repository.update(id, name, request.product())
            .orElseThrow(() ->
                    new ResourceNotFoundException("Pipeline not found: " + id)
            );
    }
}



