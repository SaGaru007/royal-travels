package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Driver-side progress update, authorised by the driver's phone number. */
public record DriverStageRequest(
        @NotBlank String phone,

        @NotBlank
        @Pattern(regexp = "started|completed", message = "Stage must be started or completed")
        String stage
) {
}
