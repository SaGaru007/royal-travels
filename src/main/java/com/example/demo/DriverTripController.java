package com.example.demo;

import com.example.demo.dto.DriverLocationRequest;
import com.example.demo.dto.DriverStageRequest;
import com.example.demo.dto.DriverTripRequest;
import com.example.demo.dto.DriverTripResponse;
import com.example.demo.service.DriverService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Public driver endpoints. Authorisation is the booking reference plus the
 * assigned driver's phone number, exactly like the customer lookup.
 */
@RestController
@RequestMapping("/api/driver/trips")
@Tag(name = "Driver trips", description = "Trip sheets for assigned chauffeurs")
public class DriverTripController {

    private final DriverService service;

    public DriverTripController(DriverService service) {
        this.service = service;
    }

    @PostMapping("/lookup")
    @Operation(summary = "Open a trip sheet as the assigned driver")
    public DriverTripResponse lookup(@Valid @RequestBody DriverTripRequest req) {
        return service.tripForDriver(req.id(), req.phone());
    }

    @PatchMapping("/{id}/stage")
    @Operation(summary = "Mark an assigned trip started or completed")
    public DriverTripResponse updateStage(@PathVariable UUID id,
                                          @Valid @RequestBody DriverStageRequest req) {
        return service.updateStage(id, req);
    }

    @PostMapping("/{id}/location")
    @Operation(summary = "Share the driver's current position with the customer tracking page")
    public ResponseEntity<Void> updateLocation(@PathVariable UUID id,
                                               @Valid @RequestBody DriverLocationRequest req) {
        service.updateLocation(id, req);
        return ResponseEntity.noContent().build();
    }
}
