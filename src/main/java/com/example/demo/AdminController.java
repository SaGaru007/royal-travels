package com.example.demo;

import com.example.demo.dto.PasswordChangeRequest;
import com.example.demo.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin account")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AuthService service;

    public AdminController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/password")
    @PreAuthorize("hasAnyRole('OWNER','STAFF')")
    @Operation(summary = "Change the signed-in admin's password")
    public ResponseEntity<Void> changePassword(Authentication authentication,
                                               @Valid @RequestBody PasswordChangeRequest req) {
        service.changePassword(authentication.getName(), req);
        return ResponseEntity.noContent().build();
    }
}
