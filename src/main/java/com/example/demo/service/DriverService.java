package com.example.demo.service;

import com.example.demo.Booking;
import com.example.demo.BookingRepository;
import com.example.demo.Driver;
import com.example.demo.DriverRepository;
import com.example.demo.VehicleRepository;
import com.example.demo.dto.DriverRequest;
import com.example.demo.dto.DriverResponse;
import com.example.demo.dto.DriverStageRequest;
import com.example.demo.dto.DriverTripResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Driver roster and the driver-facing trip sheet.
 *
 * <p>Drivers are deliberately account-less: a chauffeur proves ownership of a
 * trip with the booking reference plus the phone number dispatch has on file.
 * That is the same privacy model as the customer lookup, and it means no
 * passwords to reset for a workforce that mostly uses WhatsApp.
 */
@Service
public class DriverService {

    private static final int PHONE_MATCH_DIGITS = 10;

    private final DriverRepository repo;
    private final BookingRepository bookings;
    private final VehicleRepository vehicles;

    public DriverService(DriverRepository repo, BookingRepository bookings, VehicleRepository vehicles) {
        this.repo = repo;
        this.bookings = bookings;
        this.vehicles = vehicles;
    }

    @Transactional(readOnly = true)
    public List<DriverResponse> list() {
        return repo.findAllByOrderByNameAsc().stream().map(DriverResponse::from).toList();
    }

    @Transactional
    public DriverResponse create(DriverRequest req) {
        String phone = req.phone().trim();
        if (repo.findByPhoneIgnoreCase(phone).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A driver with this phone number already exists");
        }
        requireVehicle(req.vehicleId());

        Driver driver = new Driver();
        apply(driver, req);
        return DriverResponse.from(repo.save(driver));
    }

    @Transactional
    public DriverResponse update(UUID id, DriverRequest req) {
        Driver driver = find(id);
        String phone = req.phone().trim();
        repo.findByPhoneIgnoreCase(phone)
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "A driver with this phone number already exists");
                });
        requireVehicle(req.vehicleId());

        apply(driver, req);
        return DriverResponse.from(repo.save(driver));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found");
        }
        if (bookings.existsByDriverId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This driver is still assigned to bookings. Reassign those trips first.");
        }
        repo.deleteById(id);
    }

    /**
     * Driver trip sheet lookup. Returns the full booking only when the supplied
     * phone number belongs to the driver assigned to that booking.
     */
    @Transactional(readOnly = true)
    public DriverTripResponse tripForDriver(UUID bookingId, String phone) {
        Booking booking = findBooking(bookingId);
        Driver driver = assignedDriver(booking, phone);
        return DriverTripResponse.from(booking, driver);
    }

    /**
     * Lets the assigned driver mark the trip started/completed from their phone.
     * The customer's tracking page reflects it on its next refresh.
     */
    @Transactional
    public DriverTripResponse updateStage(UUID bookingId, DriverStageRequest req) {
        Booking booking = findBooking(bookingId);
        Driver driver = assignedDriver(booking, req.phone());

        if ("completed".equals(req.stage())) {
            if (!"completed".equals(booking.getTripStage())) {
                driver.setTripsCompleted((driver.getTripsCompleted() == null ? 0 : driver.getTripsCompleted()) + 1);
            }
            booking.setTripStage("completed");
            booking.setStatus("completed");
            driver.setStatus("available");
        } else {
            if ("completed".equals(booking.getTripStage())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This trip is already completed");
            }
            booking.setTripStage("started");
            if (!"completed".equals(booking.getStatus())) {
                booking.setStatus("confirmed");
            }
            driver.setStatus("on_trip");
        }

        bookings.save(booking);
        repo.save(driver);
        return DriverTripResponse.from(booking, driver);
    }

    private Driver assignedDriver(Booking booking, String phone) {
        if (booking.getDriverId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No driver is assigned to this booking yet");
        }
        Driver driver = find(booking.getDriverId());
        String stored = digits(driver.getPhone());
        String supplied = digits(phone);
        if (supplied.length() < PHONE_MATCH_DIGITS
                || (!stored.endsWith(supplied) && !supplied.endsWith(stored))) {
            // Same response for a wrong phone and an unknown trip.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found");
        }
        return driver;
    }

    private Booking findBooking(UUID id) {
        return bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
    }

    private Driver find(UUID id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found"));
    }

    private void requireVehicle(UUID vehicleId) {
        if (vehicleId != null && !vehicles.existsById(vehicleId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected vehicle does not exist");
        }
    }

    private static void apply(Driver driver, DriverRequest req) {
        driver.setName(req.name().trim());
        driver.setPhone(req.phone().trim());
        driver.setRating(req.rating() == null ? new BigDecimal("5.0") : req.rating());
        driver.setTripsCompleted(req.tripsCompleted() == null ? 0 : req.tripsCompleted());
        driver.setLicenseVerified(req.licenseVerified() != null && req.licenseVerified());
        driver.setStatus(req.status() == null ? "available" : req.status());
        driver.setVehicleId(req.vehicleId());
    }

    private static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }
}
