package com.example.demo.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record VehicleRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 80) String category,
        @NotBlank @Size(max = 20) String plateNumber,
        @NotNull @Min(1) @Max(100) Integer capacity,
        @Size(max = 80) String luggageCapacity,
        @NotNull @DecimalMin("0.0") BigDecimal tariffPerKm,
        @DecimalMin("0.0") BigDecimal tariffLocal,
        @Size(max = 500) String imageUrl,
        @Pattern(regexp = "active|maintenance|inactive", message = "Invalid vehicle status")
        String status
) {
}
