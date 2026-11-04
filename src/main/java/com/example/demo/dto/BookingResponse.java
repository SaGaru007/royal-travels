package com.example.demo.dto;

import com.example.demo.Booking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record BookingResponse(
        UUID id,
        OffsetDateTime createdAt,
        String serviceType,
        String name,
        String phone,
        String email,
        String pickupLocation,
        String dropLocation,
        String tripType,
        LocalDate returnDate,
        String packageType,
        String transferType,
        String flightNumber,
        LocalDate pickupDate,
        LocalTime pickupTime,
        String vehiclePreference,
        String passengers,
        String preferredCallTime,
        String notes,
        BigDecimal baseFare,
        BigDecimal totalFare,
        BigDecimal advanceAmount,
        String paymentStatus,
        String status,
        String tripStage
) {
    public static BookingResponse from(Booking b) {
        return new BookingResponse(
                b.getId(), b.getCreatedAt(), b.getServiceType(), b.getName(), b.getPhone(), b.getEmail(),
                b.getPickupLocation(), b.getDropLocation(), b.getTripType(), b.getReturnDate(), b.getPackageType(),
                b.getTransferType(), b.getFlightNumber(), b.getPickupDate(), b.getPickupTime(),
                b.getVehiclePreference(), b.getPassengers(), b.getPreferredCallTime(), b.getNotes(),
                b.getBaseFare(), b.getTotalFare(), b.getAdvanceAmount(),
                b.getPaymentStatus(), b.getStatus(), b.getTripStage()
        );
    }
}
