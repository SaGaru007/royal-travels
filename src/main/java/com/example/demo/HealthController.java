package com.example.demo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Liveness/readiness probe.
 *
 * <p>The database check matters on free hosting: Render keeps the JVM warm by
 * polling this endpoint, and the same call touches Postgres so a Supabase free
 * project is not paused for inactivity.
 */
@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "Liveness and dependency checks")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    @Operation(summary = "Service health", description = "Returns the API status plus database connectivity.")
    public Map<String, Object> health() {
        String database = pingDatabase();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "up".equals(database) ? "ok" : "degraded");
        body.put("app", "RoyalTravels");
        body.put("database", database);
        body.put("timestamp", Instant.now().toString());
        return body;
    }

    private String pingDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2) ? "up" : "down";
        } catch (Exception ex) {
            return "down";
        }
    }
}
