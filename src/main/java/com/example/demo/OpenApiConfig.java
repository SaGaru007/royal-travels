package com.example.demo;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI/Swagger metadata. The interactive UI is served at /swagger-ui.html
 * and the raw contract at /v3/api-docs.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    OpenAPI royalTravelsOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("RoyalTravels API")
                        .version("1.0.0")
                        .description("""
                                Booking, fleet and admin API for RoyalTravels, a cab and travel agency.

                                **Public endpoints** need no token: creating a booking, looking a booking up
                                (booking id + phone), reading active vehicles and the health probe.

                                **Admin endpoints** require a JWT. Get one from `POST /api/auth/login`
                                and send it as `Authorization: Bearer <token>`.
                                """)
                        .contact(new Contact()
                                .name("Sagar Hadapad")
                                .url("https://github.com/SaGaru007"))
                        .license(new License().name("MIT")))
                .servers(List.of(
                        new Server().url("/").description("Current host")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste the token returned by /api/auth/login.")));
    }
}
