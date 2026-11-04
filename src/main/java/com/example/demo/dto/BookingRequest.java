package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Public booking payload. Deliberately excludes id, timestamps, statuses and
 * money fields so callers cannot set server-owned values.
 */
public record BookingRequest(
        @NotBlank
        @Pattern(regexp = "outstation|local|airport|callback", message = "Unknown service type")
        String serviceType,

        @NotBlank @Size(max = 120) String name,

        @NotBlank
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone must contain 10-15 digits, optionally starting with +")
        String phone,

        @Email @Size(max = 160) String email,
        @Size(max = 200) String pickupLocation,
        @Size(max = 200) String dropLocation,
        @Size(max = 40) String tripType,
        @FutureOrPresent LocalDate returnDate,
        @Size(max = 80) String packageType,
        @Size(max = 80) String transferType,
        @Size(max = 20) String flightNumber,
        @FutureOrPresent LocalDate pickupDate,
        LocalTime pickupTime,
        @Size(max = 80) String vehiclePreference,
        @Size(max = 20) String passengers,
        @Size(max = 40) String preferredCallTime,
        @Size(max = 1000) String notes
) {
}
