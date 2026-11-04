package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class AdminBootstrap implements CommandLineRunner {
    private final AdminRepository repo;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public AdminBootstrap(AdminRepository repo, PasswordEncoder encoder,
                          @Value("${app.admin.email:}") String email,
                          @Value("${app.admin.password:}") String password) {
        this.repo = repo;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(String... args) {
        if (email.isBlank() || password.isBlank()) return;

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (repo.findByEmailIgnoreCase(normalizedEmail).isPresent()) return;

        Admin a = new Admin();
        a.setName("Owner");
        a.setEmail(normalizedEmail);
        a.setPasswordHash(encoder.encode(password));
        a.setRole("owner");
        repo.save(a);
    }
}
