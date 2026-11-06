package com.example.demo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A chauffeur on the roster. Drivers do not have accounts: dispatch assigns a
 * trip, and the driver opens their trip sheet with the booking reference plus
 * the phone number on this record (see DriverService.tripForDriver).
 */
@Entity
@Table(name = "drivers")
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @NotBlank
    private String name;

    @NotBlank
    private String phone;

    private BigDecimal rating = new BigDecimal("5.0");
    private Integer tripsCompleted = 0;
    private Boolean licenseVerified = false;
    private String status = "available";

    @Column(name = "vehicle_id")
    private UUID vehicleId;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }

    public Integer getTripsCompleted() { return tripsCompleted; }
    public void setTripsCompleted(Integer tripsCompleted) { this.tripsCompleted = tripsCompleted; }

    public Boolean getLicenseVerified() { return licenseVerified; }
    public void setLicenseVerified(Boolean licenseVerified) { this.licenseVerified = licenseVerified; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public UUID getVehicleId() { return vehicleId; }
    public void setVehicleId(UUID vehicleId) { this.vehicleId = vehicleId; }
}
