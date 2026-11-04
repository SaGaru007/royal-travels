package com.example.demo.dto;

import jakarta.validation.constraints.Pattern;

/**
 * Admin-only partial update. Null fields are left unchanged.
 */
public record BookingUpdateRequest(
        @Pattern(regexp = "new|contacted|confirmed|completed|cancelled", message = "Invalid status")
        String status,

        @Pattern(regexp = "pending|paid", message = "Invalid payment status")
        String paymentStatus,

        @Pattern(regexp = "assigned|started|completed", message = "Invalid trip stage")
        String tripStage
) {
}
