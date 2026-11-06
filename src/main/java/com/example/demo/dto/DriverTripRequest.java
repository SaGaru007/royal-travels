package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** A driver opens their trip sheet with the reference and their own phone. */
public record DriverTripRequest(
        @NotNull UUID id,
        @NotBlank String phone
) {
}
