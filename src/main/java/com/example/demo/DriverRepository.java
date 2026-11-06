package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DriverRepository extends JpaRepository<Driver, UUID> {
    List<Driver> findAllByOrderByNameAsc();

    Optional<Driver> findByPhoneIgnoreCase(String phone);

    boolean existsByVehicleId(UUID vehicleId);
}
