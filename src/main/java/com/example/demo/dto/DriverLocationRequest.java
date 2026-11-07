package com.example.demo.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * One position report from the assigned driver's phone.
 *
 * <p>The driver proves ownership of the trip with the phone number dispatch has
 * on file, exactly like the stage update. Coordinates are WGS84, which is what
 * {@code navigator.geolocation} returns.
 */
public record DriverLocationRequest(
        @NotBlank String phone,

        @NotNull
        @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
        Double lat,

        @NotNull
        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
        Double lng
) {
}
