package com.example.demo.service;

import com.example.demo.Customer;
import com.example.demo.CustomerRepository;
import com.example.demo.BookingRepository;
import com.example.demo.JwtService;
import com.example.demo.dto.BookingResponse;
import com.example.demo.dto.CustomerAuthResponse;
import com.example.demo.dto.CustomerLoginRequest;
import com.example.demo.dto.CustomerResponse;
import com.example.demo.dto.CustomerSignupRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/**
 * Customer self-service accounts.
 *
 * <p>Accounts are optional: guests keep booking with just a phone number. A
 * signed-in customer sees every booking made with their phone number,
 * including guest bookings created before they signed up, because bookings are
 * linked by phone rather than by a foreign key.
 */
@Service
public class CustomerService {

    private static final int PHONE_MATCH_DIGITS = 10;

    private final CustomerRepository repo;
    private final BookingRepository bookings;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public CustomerService(CustomerRepository repo, BookingRepository bookings,
                           PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.repo = repo;
        this.bookings = bookings;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public CustomerAuthResponse signup(CustomerSignupRequest req) {
        String email = normalizeEmail(req.email());
        if (repo.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        Customer customer = new Customer();
        customer.setName(req.name().trim());
        customer.setEmail(email);
        customer.setPhone(req.phone().trim());
        customer.setPasswordHash(passwordEncoder.encode(req.password()));

        // Flush so createdAt (set at INSERT) is included in the response.
        Customer saved = repo.saveAndFlush(customer);
        return token(saved);
    }

    @Transactional(readOnly = true)
    public CustomerAuthResponse login(CustomerLoginRequest req) {
        Customer customer = repo.findByEmailIgnoreCase(normalizeEmail(req.email()))
                .orElseThrow(CustomerService::invalidCredentials);
        if (!passwordEncoder.matches(req.password(), customer.getPasswordHash())) {
            throw invalidCredentials();
        }
        return token(customer);
    }

    @Transactional(readOnly = true)
    public CustomerResponse me(String email) {
        return CustomerResponse.from(requireCustomer(email));
    }

    /**
     * Every booking placed with this customer's phone number, newest first.
     * Matching on the last 10 digits keeps both "+91 98765 43210" and
     * "9876543210" working.
     */
    @Transactional(readOnly = true)
    public List<BookingResponse> myBookings(String email) {
        Customer customer = requireCustomer(email);
        String digits = digitsOnly(customer.getPhone());
        String match = digits.length() > PHONE_MATCH_DIGITS
                ? digits.substring(digits.length() - PHONE_MATCH_DIGITS)
                : digits;
        return bookings.findByPhoneDigits(match).stream().map(BookingResponse::from).toList();
    }

    private Customer requireCustomer(String email) {
        return repo.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account no longer exists"));
    }

    private CustomerAuthResponse token(Customer customer) {
        return new CustomerAuthResponse(
                jwtService.generate(customer.getEmail(), "customer"),
                customer.getName(),
                customer.getEmail(),
                "customer");
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private static ResponseStatusException invalidCredentials() {
        // Same message for unknown email and wrong password: no account enumeration.
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }
}
