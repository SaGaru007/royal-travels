package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
        @NotBlank String currentPassword,

        @NotBlank
        @Size(min = 8, max = 72, message = "Password must be 8-72 characters")
        String newPassword
) {
}
