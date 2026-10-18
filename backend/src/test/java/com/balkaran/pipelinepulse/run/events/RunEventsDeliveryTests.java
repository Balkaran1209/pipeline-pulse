package com.balkaran.pipelinepulse.run.events;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import com.balkaran.pipelinepulse.pipeline.CreatePipelineRequest;
import com.balkaran.pipelinepulse.pipeline.PipelineService;
import com.balkaran.pipelinepulse.run.CreateRunRequest;
import com.balkaran.pipelinepulse.run.RunService;
import com.balkaran.pipelinepulse.run.UpdateRunRequest;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.TaskScheduler;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.run-events.heartbeat-ms=60000",
                "server.shutdown=immediate"
        }
)
class RunEventsDeliveryTests {

    @Autowired
    private PipelineService pipelines;

    @Autowired
    private RunService runs;

    @Autowired
    private Environment environment;

    @Autowired
    @Qualifier("runEventScheduler")
    private TaskScheduler scheduler;

    @Test
    @Timeout(30)
    void delayedDeliveryPreservesEachStatusChange() throws Exception {
        var pipeline = pipelines.create(
                new CreatePipelineRequest("SSE delivery test", "flasharray"),
                null
        );

        var release = new CountDownLatch(1);
        var workerPaused = new CountDownLatch(1);

        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();

        try (var readers = Executors.newVirtualThreadPerTaskExecutor()) {
            var run = runs.create(
                    pipeline.id(),
                    new CreateRunRequest(
                            "SSE delivery test",
                            "0123456789abcdef0123456789abcdef01234567"
                    )
            );

            String port = environment.getRequiredProperty("local.server.port");

            var request = HttpRequest.newBuilder(URI.create(
                    "http://localhost:" + port
                            + "/api/v1/runs/" + run.id() + "/events"
            ))
                    .timeout(Duration.ofSeconds(3))
                    .header("Accept", "text/event-stream")
                    .GET()
                    .build();

            var response = client.send(
                    request,
                    HttpResponse.BodyHandlers.ofInputStream()
            );

            try (var body = response.body()) {
                assertEquals(200, response.statusCode());

                var reader = new BufferedReader(
                        new InputStreamReader(body, StandardCharsets.UTF_8)
                );

                assertEquals(
                        "{\"status\":\"queued\"}",
                        readers.submit(() -> nextData(reader))
                                .get(3, TimeUnit.SECONDS)
                );

                // Hold the event worker while two updates commit.
                scheduler.schedule(() -> {
                    workerPaused.countDown();

                    try {
                        release.await(10, TimeUnit.SECONDS);
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                    }
                }, Instant.now());

                assertTrue(
                        workerPaused.await(3, TimeUnit.SECONDS),
                        "Event worker did not pause"
                );

                runs.updateStatus(run.id(), new UpdateRunRequest("running"));
                runs.updateStatus(run.id(), new UpdateRunRequest("passed"));

                release.countDown();

                assertEquals(
                        "{\"status\":\"running\"}",
                        readers.submit(() -> nextData(reader))
                                .get(3, TimeUnit.SECONDS),
                        "The intermediate running event must be delivered"
                );

                assertEquals(
                        "{\"status\":\"passed\"}",
                        readers.submit(() -> nextData(reader))
                                .get(3, TimeUnit.SECONDS)
                );
            }
        } finally {
            release.countDown();
            client.shutdownNow();

            try {
                client.awaitTermination(Duration.ofSeconds(3));
            } finally {
                pipelines.deleteById(pipeline.id());
            }
        }
    }

    private static String nextData(BufferedReader reader) throws Exception {
        String line;

        while ((line = reader.readLine()) != null) {
            if (line.startsWith("data:")) {
                return line.substring(5).strip();
            }
        }

        return null;
    }
}