package com.example.demo.service;

import com.example.demo.Booking;
import com.example.demo.BookingRepository;
import com.example.demo.dto.BookingRequest;
import com.example.demo.dto.BookingResponse;
import com.example.demo.dto.BookingUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class BookingService {

    private static final Set<String> SERVICE_TYPES = Set.of("outstation", "local", "airport", "callback");
    private static final Set<String> PICKUP_REQUIRED = Set.of("outstation", "local", "airport");
    private static final java.time.Duration DUPLICATE_WINDOW = java.time.Duration.ofMinutes(10);

    private final BookingRepository repo;

    public BookingService(BookingRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public BookingResponse create(BookingRequest req) {
        validateBusinessRules(req);
        rejectDuplicate(req);

        Booking b = new Booking();
        apply(b, req);
        b.setStatus("new");
        b.setPaymentStatus("pending");
        b.setTripStage("assigned");

        // saveAndFlush: the DB assigns createdAt (@CreationTimestamp) on INSERT,
        // so the row must be written before mapping the response.
        return BookingResponse.from(repo.saveAndFlush(b));
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> list(String status, String q, Pageable pageable) {
        return repo.search(blankToEmpty(status), blankToEmpty(q), pageable).map(BookingResponse::from);
    }

    @Transactional(readOnly = true)
    public BookingResponse get(UUID id) {
        return BookingResponse.from(find(id));
    }

    /**
     * Public confirmation lookup. The booking UUID alone is not enough: the
     * customer must also supply the phone number used on the booking.
     */
    @Transactional(readOnly = true)
    public BookingResponse lookup(UUID id, String phone) {
        Booking b = find(id);
        String stored = digits(b.getPhone());
        String supplied = digits(phone);
        if (supplied.length() < 10 || (!stored.endsWith(supplied) && !supplied.endsWith(stored))) {
            // Same response for a wrong phone and a missing booking.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        return BookingResponse.from(b);
    }

    @Transactional
    public BookingResponse update(UUID id, BookingUpdateRequest req) {
        Booking b = find(id);
        if (req.status() != null) b.setStatus(req.status());
        if (req.paymentStatus() != null) b.setPaymentStatus(req.paymentStatus());
        if (req.tripStage() != null) b.setTripStage(req.tripStage());
        return BookingResponse.from(repo.save(b));
    }

    private Booking find(UUID id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
    }

    /**
     * Blocks accidental duplicate submissions: the same guest, phone and trip
     * within a short window returns the original booking reference instead of
     * creating a second row. Double-clicks, browser retries and flaky mobile
     * networks are the usual culprits.
     */
    private void rejectDuplicate(BookingRequest req) {
        String phone = digits(req.phone());
        OffsetDateTime since = OffsetDateTime.now().minus(DUPLICATE_WINDOW);

        for (Booking existing : repo.findByCreatedAtAfter(since)) {
            boolean sameGuest = digits(existing.getPhone()).equals(phone)
                    && existing.getName() != null
                    && existing.getName().equalsIgnoreCase(req.name().trim());
            boolean sameTrip = Objects.equals(existing.getServiceType(), req.serviceType())
                    && Objects.equals(existing.getPickupDate(), req.pickupDate())
                    && Objects.equals(existing.getPickupTime(), req.pickupTime());

            if (sameGuest && sameTrip) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This booking was already received (reference "
                                + existing.getId().toString().substring(0, 8).toUpperCase()
                                + "). Check your confirmation page, or call us if you need changes.");
            }
        }
    }

    private void validateBusinessRules(BookingRequest req) {        String service = req.serviceType();
        if (!SERVICE_TYPES.contains(service)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown service type");
        }
        if (PICKUP_REQUIRED.contains(service) && req.pickupDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup date is required");
        }
        if (!"callback".equals(service) && isBlank(req.pickupLocation())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup location is required");
        }
        if (("outstation".equals(service) || "airport".equals(service)) && isBlank(req.dropLocation())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Drop location is required");
        }
        if ("outstation".equals(service) && "round".equalsIgnoreCase(req.tripType()) && req.returnDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Return date is required for a round trip");
        }
        if (req.pickupDate() != null && req.returnDate() != null && req.returnDate().isBefore(req.pickupDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Return date cannot be before pickup date");
        }
        if (req.pickupDate() != null && req.pickupDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup date cannot be in the past");
        }
    }

    private static void apply(Booking b, BookingRequest req) {
        b.setServiceType(req.serviceType());
        b.setName(trim(req.name()));
        b.setPhone(trim(req.phone()));
        b.setEmail(trimToNull(req.email()));
        b.setPickupLocation(trimToNull(req.pickupLocation()));
        b.setDropLocation(trimToNull(req.dropLocation()));
        b.setTripType(trimToNull(req.tripType()));
        b.setReturnDate(req.returnDate());
        b.setPackageType(trimToNull(req.packageType()));
        b.setTransferType(trimToNull(req.transferType()));
        b.setFlightNumber(trimToNull(req.flightNumber()));
        b.setPickupDate(req.pickupDate());
        b.setPickupTime(req.pickupTime());
        b.setVehiclePreference(trimToNull(req.vehiclePreference()));
        b.setPassengers(trimToNull(req.passengers()));
        b.setPreferredCallTime(trimToNull(req.preferredCallTime()));
        b.setNotes(trimToNull(req.notes()));
        // Fare and status fields are intentionally server-owned.
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
