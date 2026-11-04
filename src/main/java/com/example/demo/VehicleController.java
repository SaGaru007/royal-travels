package com.example.demo;

import com.example.demo.dto.VehicleRequest;
import com.example.demo.dto.VehicleResponse;
import com.example.demo.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class VehicleController {

    private final VehicleService service;

    public VehicleController(VehicleService service) {
        this.service = service;
    }

    @GetMapping("/api/vehicles")
    public List<VehicleResponse> list() {
        return service.listPublic();
    }

    @GetMapping("/api/vehicles/{id}")
    public VehicleResponse get(@PathVariable UUID id) {
        return service.getPublic(id);
    }

    @GetMapping("/api/admin/vehicles")
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    public List<VehicleResponse> listAll() {
        return service.listAll();
    }

    @PostMapping("/api/admin/vehicles")
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    public ResponseEntity<VehicleResponse> create(@Valid @RequestBody VehicleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/api/admin/vehicles/{id}")
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    public VehicleResponse update(@PathVariable UUID id, @Valid @RequestBody VehicleRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/api/admin/vehicles/{id}")
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
