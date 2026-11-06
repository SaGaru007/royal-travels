package com.example.demo.dto;

import com.example.demo.Booking;
import com.example.demo.Driver;

public record DriverTripResponse(
        BookingResponse booking,
        String driverName
) {
    public static DriverTripResponse from(Booking booking, Driver driver) {
        return new DriverTripResponse(BookingResponse.from(booking), driver.getName());
    }
}
