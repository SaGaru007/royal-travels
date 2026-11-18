package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * A driver opens their trip sheet with the reference (the trip-sheet link's
 * UUID, or the short RT-XXXXXXXX reference) and their own phone number.
 */
public record DriverTripRequest(
        UUID id,
        @Size(max = 64, message = "Reference is too long") String reference,
        @NotBlank String phone
) {
}
