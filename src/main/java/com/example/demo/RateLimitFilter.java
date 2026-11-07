package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple fixed-window rate limiter for the unauthenticated write endpoints.
 *
 * <p>Why it exists: these routes accept input from anyone on the internet, so
 * without a limit a single client could flood the bookings table or brute-force
 * admin logins. It is deliberately dependency-free and in-process — right-sized
 * for a single instance. If the API ever runs as multiple replicas behind one
 * IP, replace this with a shared store (Redis) or an edge/gateway limiter
 * (Cloudflare, nginx limit_req); the HTTP contract (429 + Retry-After) stays
 * the same.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private record Limit(int maxRequests, Duration window) {}

    private static final Map<String, Limit> LIMITS = Map.of(
            "POST /api/auth/login", new Limit(10, Duration.ofMinutes(5)),
            "POST /api/auth/customer/login", new Limit(10, Duration.ofMinutes(5)),
            "POST /api/auth/customer/signup", new Limit(5, Duration.ofHours(1)),
            "POST /api/bookings", new Limit(20, Duration.ofMinutes(10)),
            "POST /api/bookings/lookup", new Limit(60, Duration.ofMinutes(10)),
            "POST /api/driver/trips/lookup", new Limit(60, Duration.ofMinutes(10)));

    /**
     * Paths with a variable segment (the trip id) cannot be matched by the
     * exact map above. A driver reporting every 10 s is 60 requests per
     * 10 minutes, so this leaves room for a shared IP without allowing a
     * flood. Exact entries win over prefixes because they are checked first.
     */
    private static final Map<String, Limit> PREFIX_LIMITS = Map.of(
            "POST /api/driver/trips/", new Limit(90, Duration.ofMinutes(10)));

    private static final int MAX_TRACKED_CLIENTS = 50_000;

    private final ObjectMapper objectMapper = new ObjectMapper();
    /** Client IP -> timestamps (millis) of accepted requests inside the window. */
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only the unauthenticated write routes are limited.
        return limitFor(request.getMethod(), request.getRequestURI()) == null;
    }

    private Limit limitFor(String method, String uri) {
        String key = method + " " + uri;
        Limit exact = LIMITS.get(key);
        if (exact != null) {
            return exact;
        }
        for (Map.Entry<String, Limit> entry : PREFIX_LIMITS.entrySet()) {
            if (key.startsWith(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Limit limit = limitFor(request.getMethod(), request.getRequestURI());
        if (limit == null) {
            chain.doFilter(request, response);
            return;
        }
        String key = clientIp(request) + "|" + request.getRequestURI();
        long now = System.currentTimeMillis();
        long windowStart = now - limit.window().toMillis();

        Deque<Long> timestamps = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        boolean allowed;
        long oldest = 0;
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.removeFirst();
            }
            allowed = timestamps.size() < limit.maxRequests();
            if (allowed) {
                timestamps.addLast(now);
                oldest = timestamps.isEmpty() ? now : timestamps.peekFirst();
            }
        }

        if (!allowed) {
            reject(response, limit, oldest);
            return;
        }

        if (hits.size() > MAX_TRACKED_CLIENTS) {
            // Lazy memory bound: drop expired windows when the map grows too big.
            hits.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    Long first = e.getValue().peekFirst();
                    return first == null || first < windowStart;
                }
            });
        }

        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, Limit limit, long oldestHit) throws IOException {
        long retryAfterSeconds = Math.max(1,
                limit.window().toSeconds() - (System.currentTimeMillis() - oldestHit) / 1000);

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
                "Too many requests. Please try again in a moment.");
        problem.setTitle("Rate limit exceeded");
        problem.setProperty("retryAfterSeconds", retryAfterSeconds);
        objectMapper.writeValue(response.getWriter(), problem);
    }

    private String clientIp(HttpServletRequest request) {
        // Render/nginx-style proxies put the original client first. Untrusted in
        // theory (a client could send its own header); acceptable here because
        // the limiter is abuse mitigation, not an access-control decision.
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
