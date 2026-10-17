package com.balkaran.pipelinepulse.note;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NoteController {

    private final NoteService service;

    public NoteController(NoteService service) {
        this.service = service;
    }

    @PostMapping("/runs/{runId}/notes")
    public ResponseEntity<Note> create(
            @PathVariable("runId") String runId,
            @Valid @RequestBody CreateNoteRequest request
    ) {
        Note note = service.create(runId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(note);
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Void> deleteById(
            @PathVariable("id") String id
    ) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}