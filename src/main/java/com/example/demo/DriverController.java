package com.example.demo;

import com.example.demo.dto.DriverRequest;
import com.example.demo.dto.DriverResponse;
import com.example.demo.service.DriverService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/drivers")
@Tag(name = "Drivers", description = "Chauffeur roster used for trip assignment")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('OWNER','STAFF')")
public class DriverController {

    private final DriverService service;

    public DriverController(DriverService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List the driver roster")
    public List<DriverResponse> list() {
        return service.list();
    }

    @PostMapping
    @Operation(summary = "Add a driver")
    public ResponseEntity<DriverResponse> create(@Valid @RequestBody DriverRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a driver")
    public DriverResponse update(@PathVariable UUID id, @Valid @RequestBody DriverRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove a driver who has no assigned trips")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
