package com.example.demo.dto;

import com.example.demo.Driver;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DriverResponse(
        UUID id,
        OffsetDateTime createdAt,
        String name,
        String phone,
        BigDecimal rating,
        Integer tripsCompleted,
        Boolean licenseVerified,
        String status,
        UUID vehicleId
) {
    public static DriverResponse from(Driver d) {
        return new DriverResponse(
                d.getId(), d.getCreatedAt(), d.getName(), d.getPhone(), d.getRating(),
                d.getTripsCompleted(), d.getLicenseVerified(), d.getStatus(), d.getVehicleId()
        );
    }
}
