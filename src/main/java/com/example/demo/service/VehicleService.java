package com.example.demo.service;

import com.example.demo.Vehicle;
import com.example.demo.VehicleRepository;
import com.example.demo.dto.VehicleRequest;
import com.example.demo.dto.VehicleResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Fleet business logic. The public catalog is served from a short-lived
 * in-process cache: the vehicle list changes a few times a year, but it is
 * read on every homepage visit, so most reads should not touch the database
 * at all. Any admin write invalidates the cache immediately, so the public
 * site reflects changes within one request.
 */
@Service
public class VehicleService {

    private static final String ACTIVE = "active";
    private static final Duration PUBLIC_TTL = Duration.ofSeconds(60);

    private final VehicleRepository repo;

    /** Immutable snapshot; readers only do a volatile read, no locks. */
    private record Snapshot(List<VehicleResponse> vehicles, long expiresAtMillis) {}

    private volatile Snapshot activeCache;

    public VehicleService(VehicleRepository repo) {
        this.repo = repo;
    }

    public List<VehicleResponse> listPublic() {
        Snapshot snapshot = activeCache;
        long now = System.currentTimeMillis();
        if (snapshot != null && now < snapshot.expiresAtMillis()) {
            return snapshot.vehicles();
        }
        List<VehicleResponse> fresh = repo.findByStatusOrderByNameAsc(ACTIVE).stream()
                .map(VehicleResponse::from)
                .toList();
        activeCache = new Snapshot(fresh, now + PUBLIC_TTL.toMillis());
        return fresh;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listAll() {
        return repo.findAllByOrderByNameAsc().stream().map(VehicleResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public VehicleResponse getPublic(UUID id) {
        Vehicle v = find(id);
        if (!ACTIVE.equals(v.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
        return VehicleResponse.from(v);
    }

    @Transactional
    public VehicleResponse create(VehicleRequest req) {
        Vehicle v = new Vehicle();
        apply(v, req);
        if (v.getStatus() == null || v.getStatus().isBlank()) v.setStatus(ACTIVE);
        VehicleResponse saved = VehicleResponse.from(repo.save(v));
        evict();
        return saved;
    }

    @Transactional
    public VehicleResponse update(UUID id, VehicleRequest req) {
        Vehicle v = find(id);
        apply(v, req);
        if (req.status() == null) {
            // PUT is a full replacement, but omitting status should not silently
            // reactivate a vehicle that is in maintenance.
            v.setStatus(v.getStatus() == null ? ACTIVE : v.getStatus());
        }
        VehicleResponse saved = VehicleResponse.from(repo.save(v));
        evict();
        return saved;
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
        repo.deleteById(id);
        evict();
    }

    private void evict() {
        activeCache = null;
    }

    private Vehicle find(UUID id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found"));
    }

    private static void apply(Vehicle v, VehicleRequest req) {
        v.setName(req.name().trim());
        v.setCategory(req.category().trim());
        v.setPlateNumber(req.plateNumber().trim());
        v.setCapacity(req.capacity());
        v.setLuggageCapacity(req.luggageCapacity());
        v.setTariffPerKm(req.tariffPerKm());
        v.setTariffLocal(req.tariffLocal());
        v.setImageUrl(req.imageUrl());
        if (req.status() != null) v.setStatus(req.status());
    }
}
