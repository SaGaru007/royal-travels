package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Confirmation/tracking lookup. Either the booking UUID (from a tracking link)
 * or the short reference printed on the confirmation (RT-XXXXXXXX) is accepted,
 * but never both: the phone number is still required in every case.
 */
public record LookupRequest(
        UUID id,
        @Size(max = 64, message = "Reference is too long") String reference,
        @NotBlank String phone
) {
}
