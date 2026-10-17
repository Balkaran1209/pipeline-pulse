package com.balkaran.pipelinepulse.run.events;

import java.io.IOException;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class RunEventsController {

    private final RunEventService service;

    public RunEventsController(RunEventService service) {
        this.service = service;
    }

    @GetMapping("/runs/{id}/events")
    public ResponseEntity<SseEmitter> subscribe(
            @PathVariable("id") String id
    ) throws IOException {
        SseEmitter emitter = service.subscribe(id);

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .cacheControl(CacheControl.noStore())
                .header("X-Accel-Buffering", "no")
                .body(emitter);
    }
}