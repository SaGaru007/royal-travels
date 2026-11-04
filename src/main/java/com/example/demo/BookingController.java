package com.example.demo;

import com.example.demo.dto.BookingRequest;
import com.example.demo.dto.BookingResponse;
import com.example.demo.dto.BookingUpdateRequest;
import com.example.demo.dto.LookupRequest;
import com.example.demo.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService service;

    public BookingController(BookingService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> create(@Valid @RequestBody BookingRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    /**
     * Public confirmation/tracking lookup. Requires the booking UUID plus the
     * phone number used when the booking was created.
     */
    @PostMapping("/lookup")
    public BookingResponse lookup(@Valid @RequestBody LookupRequest req) {
        return service.lookup(req.id(), req.phone());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    public Page<BookingResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false, name = "q") String q,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.list(status, q, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    public BookingResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    public BookingResponse update(@PathVariable UUID id, @Valid @RequestBody BookingUpdateRequest req) {
        return service.update(id, req);
    }
}
