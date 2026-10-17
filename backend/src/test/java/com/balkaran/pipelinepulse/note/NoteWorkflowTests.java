package com.balkaran.pipelinepulse.note;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import com.balkaran.pipelinepulse.common.ResourceNotFoundException;
import com.balkaran.pipelinepulse.pipeline.CreatePipelineRequest;
import com.balkaran.pipelinepulse.pipeline.Pipeline;
import com.balkaran.pipelinepulse.pipeline.PipelineService;
import com.balkaran.pipelinepulse.run.CreateRunRequest;
import com.balkaran.pipelinepulse.run.Run;
import com.balkaran.pipelinepulse.run.RunDetails;
import com.balkaran.pipelinepulse.run.RunService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class NoteWorkflowTests {

    @Autowired
    private PipelineService pipelineService;

    @Autowired
    private RunService runService;

    @Autowired
    private NoteService noteService;

    private Pipeline pipeline;
    private Run run;

    @BeforeEach
    void setUp() {
        pipeline = pipelineService.create(
                new CreatePipelineRequest(
                        "Note workflow test",
                        "flasharray"
                ),
                null
        );

        run = createRun();
    }

    @Test
    void notesAppearOnlyOnTheirOwnRunAndPreserveBodyFormatting() {
        String body = "  First line\n    Indented second line\n";

        Note note = noteService.create(
                run.id(),
                new CreateNoteRequest("  Test Author  ", body)
        );

        assertNotNull(note.id());
        assertNotNull(note.createdAt());
        assertEquals(run.id(), note.runId());
        assertEquals("Test Author", note.author());
        assertEquals(body, note.body());

        Run otherRun = createRun();
        Note otherNote = createNote(otherRun.id(), "Another run's note");

        RunDetails details = runService.findById(run.id());

        assertEquals(List.of(note), details.notes());
        assertEquals(
                List.of(otherNote),
                runService.findById(otherRun.id()).notes()
        );
    }

    @Test
    void deletingOneNotePreservesOtherNotes() {
        Note first = createNote(run.id(), "First note");
        Note second = createNote(run.id(), "Second note");

        noteService.deleteById(first.id());

        assertEquals(
                List.of(second),
                runService.findById(run.id()).notes()
        );

        assertThrows(
                ResourceNotFoundException.class,
                () -> noteService.deleteById(first.id())
        );
    }

    @Test
    void missingRunsAndNotesAreRejected() {
        assertThrows(
                ResourceNotFoundException.class,
                () -> createNote(
                        "missing-run-" + run.id(),
                        "This must not be saved"
                )
        );

        assertThrows(
                ResourceNotFoundException.class,
                () -> noteService.deleteById(
                        "missing-note-" + run.id()
                )
        );

        assertEquals(
                List.of(),
                runService.findById(run.id()).notes()
        );
    }

    @Test
    void deletingPipelineCascadesToItsRunsAndNotes() {
        Note firstNote = createNote(run.id(), "First run's note");

        Run otherRun = createRun();
        Note secondNote = createNote(
                otherRun.id(),
                "Second run's note"
        );

        pipelineService.deleteById(pipeline.id());

        assertThrows(
                ResourceNotFoundException.class,
                () -> runService.findById(run.id())
        );

        assertThrows(
                ResourceNotFoundException.class,
                () -> runService.findById(otherRun.id())
        );

        assertThrows(
                ResourceNotFoundException.class,
                () -> noteService.deleteById(firstNote.id())
        );

        assertThrows(
                ResourceNotFoundException.class,
                () -> noteService.deleteById(secondNote.id())
        );
    }

    private Run createRun() {
        return runService.create(
                pipeline.id(),
                new CreateRunRequest(
                        "Note workflow test",
                        "0123456789abcdef0123456789abcdef01234567"
                )
        );
    }

    private Note createNote(String runId, String body) {
        return noteService.create(
                runId,
                new CreateNoteRequest("Test Author", body)
        );
    }
}