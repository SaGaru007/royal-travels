package com.example.demo.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record DriverRequest(
        @NotBlank @Size(max = 120) String name,

        @NotBlank
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone must contain 10-15 digits, optionally starting with +")
        String phone,

        @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal rating,

        @Min(0) Integer tripsCompleted,

        Boolean licenseVerified,

        @Pattern(regexp = "available|on_trip|off_duty", message = "Invalid driver status")
        String status,

        UUID vehicleId
) {
}
