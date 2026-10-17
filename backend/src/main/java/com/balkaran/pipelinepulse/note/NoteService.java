package com.balkaran.pipelinepulse.note;

import java.util.UUID;

import com.balkaran.pipelinepulse.common.ResourceNotFoundException;

import org.springframework.stereotype.Service;

@Service
public class NoteService {

    private final NoteRepository repository;

    public NoteService(NoteRepository repository) {
        this.repository = repository;
    }

    public Note create(String runId, CreateNoteRequest request) {
        return repository.create(
                UUID.randomUUID().toString(),
                runId,
                request.author().strip(),
                request.body()
        ).orElseThrow(() ->
                new ResourceNotFoundException("Run not found: " + runId)
        );
    }

    public void deleteById(String id) {
        int deletedRows = repository.deleteById(id);

        if (deletedRows == 0) {
            throw new ResourceNotFoundException("Note not found: " + id);
        }
    }
}