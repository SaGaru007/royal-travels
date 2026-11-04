package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LookupRequest(
        @NotNull UUID id,
        @NotBlank String phone
) {
}
