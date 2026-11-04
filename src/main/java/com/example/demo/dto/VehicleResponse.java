package com.example.demo.dto;

import com.example.demo.Vehicle;

import java.math.BigDecimal;
import java.util.UUID;

public record VehicleResponse(
        UUID id,
        String name,
        String category,
        String plateNumber,
        Integer capacity,
        String luggageCapacity,
        BigDecimal tariffPerKm,
        BigDecimal tariffLocal,
        String imageUrl,
        String status
) {
    public static VehicleResponse from(Vehicle v) {
        return new VehicleResponse(
                v.getId(), v.getName(), v.getCategory(), v.getPlateNumber(), v.getCapacity(),
                v.getLuggageCapacity(), v.getTariffPerKm(), v.getTariffLocal(), v.getImageUrl(), v.getStatus()
        );
    }
}
