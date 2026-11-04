package com.example.demo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "vehicles")
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank private String name;
    @NotBlank private String category;
    @NotBlank private String plateNumber;
    private Integer capacity;
    private String luggageCapacity;
    private BigDecimal tariffPerKm;
    private BigDecimal tariffLocal;
    private String imageUrl;
    private String status = "active";

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getPlateNumber() { return plateNumber; }
    public void setPlateNumber(String plateNumber) { this.plateNumber = plateNumber; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public String getLuggageCapacity() { return luggageCapacity; }
    public void setLuggageCapacity(String luggageCapacity) { this.luggageCapacity = luggageCapacity; }
    public BigDecimal getTariffPerKm() { return tariffPerKm; }
    public void setTariffPerKm(BigDecimal tariffPerKm) { this.tariffPerKm = tariffPerKm; }
    public BigDecimal getTariffLocal() { return tariffLocal; }
    public void setTariffLocal(BigDecimal tariffLocal) { this.tariffLocal = tariffLocal; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}