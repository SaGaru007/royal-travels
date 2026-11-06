package com.example.demo.service;

import com.example.demo.Admin;
import com.example.demo.AdminRepository;
import com.example.demo.JwtService;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.dto.PasswordChangeRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AuthService {

    private final AdminRepository repo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(AdminRepository repo, PasswordEncoder encoder, JwtService jwt) {
        this.repo = repo;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        Admin admin = repo.findByEmailIgnoreCase(email).orElse(null);
        if (admin == null || admin.getPasswordHash() == null
                || !encoder.matches(req.password(), admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String role = admin.getRole() == null ? "staff" : admin.getRole();
        String name = admin.getName() == null ? email : admin.getName();
        return new LoginResponse(jwt.generate(admin.getEmail(), role), name, role);
    }

    /**
     * Password rotation from the admin console. The current password is
     * required, so a stolen session token cannot silently lock the owner out.
     */
    @Transactional
    public void changePassword(String email, PasswordChangeRequest req) {
        Admin admin = repo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account no longer exists"));

        if (!encoder.matches(req.currentPassword(), admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        admin.setPasswordHash(encoder.encode(req.newPassword()));
        repo.save(admin);
    }
}
