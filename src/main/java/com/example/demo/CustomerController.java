package com.example.demo;

import com.example.demo.dto.BookingResponse;
import com.example.demo.dto.CustomerAuthResponse;
import com.example.demo.dto.CustomerLoginRequest;
import com.example.demo.dto.CustomerResponse;
import com.example.demo.dto.CustomerSignupRequest;
import com.example.demo.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Tag(name = "Customer accounts", description = "Self-service signup and booking history")
public class CustomerController {

    private final CustomerService service;

    public CustomerController(CustomerService service) {
        this.service = service;
    }

    @PostMapping("/api/auth/customer/signup")
    @Operation(summary = "Create a customer account", description = "Returns a JWT scoped to the customer role.")
    public ResponseEntity<CustomerAuthResponse> signup(@Valid @RequestBody CustomerSignupRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.signup(req));
    }

    @PostMapping("/api/auth/customer/login")
    @Operation(summary = "Customer login")
    public CustomerAuthResponse login(@Valid @RequestBody CustomerLoginRequest req) {
        return service.login(req);
    }

    @GetMapping("/api/customer/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Current customer profile")
    public CustomerResponse me(Authentication authentication) {
        return service.me(authentication.getName());
    }

    @GetMapping("/api/customer/bookings")
    @PreAuthorize("hasRole('CUSTOMER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Bookings made with the account's phone number")
    public List<BookingResponse> myBookings(Authentication authentication) {
        return service.myBookings(authentication.getName());
    }
}
