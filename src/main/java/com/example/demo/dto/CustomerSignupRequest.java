package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CustomerSignupRequest(
        @NotBlank @Size(max = 120) String name,

        @NotBlank @Email @Size(max = 160) String email,

        @NotBlank
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone must contain 10-15 digits, optionally starting with +")
        String phone,

        @NotBlank
        @Size(min = 8, max = 72, message = "Password must be 8-72 characters")
        String password
) {
}
