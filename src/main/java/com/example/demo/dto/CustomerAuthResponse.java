package com.example.demo.dto;

/** Token payload returned by customer signup and login. */
public record CustomerAuthResponse(
        String token,
        String name,
        String email,
        String role
) {
}
