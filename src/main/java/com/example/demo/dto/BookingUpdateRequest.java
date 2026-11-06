package com.example.demo.dto;

import jakarta.validation.constraints.Pattern;

/**
 * Admin-only partial update. Null fields are left unchanged.
 *
 * <p>driverId is a string because an empty value means "unassign"; a UUID
 * cannot express both "absent" and "clear".
 */
public record BookingUpdateRequest(
        @Pattern(regexp = "new|contacted|confirmed|completed|cancelled", message = "Invalid status")
        String status,

        @Pattern(regexp = "pending|paid", message = "Invalid payment status")
        String paymentStatus,

        @Pattern(regexp = "assigned|started|completed", message = "Invalid trip stage")
        String tripStage,

        @Pattern(
                regexp = "^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
                message = "Invalid driver id")
        String driverId
) {
}
