package com.example.demo.service;

import com.example.demo.Vehicle;
import com.example.demo.VehicleRepository;
import com.example.demo.dto.VehicleRequest;
import com.example.demo.dto.VehicleResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class VehicleService {

    private static final String ACTIVE = "active";

    private final VehicleRepository repo;

    public VehicleService(VehicleRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listPublic() {
        return repo.findByStatusOrderByNameAsc(ACTIVE).stream().map(VehicleResponse::from).toList();
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
        return VehicleResponse.from(repo.save(v));
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
        return VehicleResponse.from(repo.save(v));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
        repo.deleteById(id);
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
