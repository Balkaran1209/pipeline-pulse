package com.balkaran.pipelinepulse.run.events;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import com.balkaran.pipelinepulse.pipeline.CreatePipelineRequest;
import com.balkaran.pipelinepulse.pipeline.PipelineService;
import com.balkaran.pipelinepulse.run.CreateRunRequest;
import com.balkaran.pipelinepulse.run.RunService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.run-events.heartbeat-ms=100"
)
class RunEventsCleanupTests {

    @Autowired
    private PipelineService pipelines;

    @Autowired
    private RunService runs;

    @Autowired
    private RunEventService events;

    @Autowired
    private Environment environment;

    @Test
    @Timeout(90)
    void disconnectingFiftyTimesLeavesNoSubscribers() throws Exception {
        var pipeline = pipelines.create(
                new CreatePipelineRequest(
                        "SSE cleanup test",
                        "flasharray"
                ),
                null
        );

        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();

        try (var readers = Executors.newVirtualThreadPerTaskExecutor()) {
            var run = runs.create(
                    pipeline.id(),
                    new CreateRunRequest(
                            "SSE cleanup test",
                            "0123456789abcdef0123456789abcdef01234567"
                    )
            );

            String port = environment.getRequiredProperty(
                    "local.server.port"
            );

            URI uri = URI.create(
                    "http://localhost:" + port
                            + "/api/v1/runs/" + run.id() + "/events"
            );

            awaitSubscriberCount(0);

            for (int attempt = 1; attempt <= 50; attempt++) {
                HttpRequest request = HttpRequest.newBuilder(uri)
                        .timeout(Duration.ofSeconds(3))
                        .header("Accept", "text/event-stream")
                        .GET()
                        .build();

                var response = client.send(
                        request,
                        HttpResponse.BodyHandlers.ofInputStream()
                );

                try (InputStream body = response.body()) {
                    assertEquals(200, response.statusCode());

                    var reader = new BufferedReader(
                            new InputStreamReader(
                                    body,
                                    StandardCharsets.UTF_8
                            )
                    );

                    var firstEvent = readers.submit(() -> {
                        String line;

                        while ((line = reader.readLine()) != null) {
                            if (line.startsWith("data:")) {
                                return line.substring(5).strip();
                            }
                        }

                        return null;
                    });

                    assertEquals(
                            "{\"status\":\"queued\"}",
                            firstEvent.get(3, TimeUnit.SECONDS),
                            "Initial event on connection " + attempt
                    );

                    awaitSubscriberCount(1);
                }

                // Closing the response body disconnects this client.
                awaitSubscriberCount(0);
            }
        } finally {
            client.shutdownNow();

            try {
                client.awaitTermination(Duration.ofSeconds(3));
            } finally {
                pipelines.deleteById(pipeline.id());
            }
        }
    }

    private void awaitSubscriberCount(int expected)
            throws InterruptedException {
        long deadline = System.nanoTime()
                + TimeUnit.SECONDS.toNanos(5);

        while (events.subscriberCount() != expected
                && System.nanoTime() < deadline) {
            Thread.sleep(20);
        }

        assertEquals(
                expected,
                events.subscriberCount(),
                "Unexpected number of active SSE subscribers"
        );
    }
}