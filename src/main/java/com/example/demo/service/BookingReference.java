package com.example.demo.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

/**
 * Shared rules for the short booking reference customers see on screen
 * ("RT-1A2B3C4D") and for the phone numbers used as the second factor.
 */
final class BookingReference {

    private static final int MIN_PREFIX_LENGTH = 6;

    private BookingReference() {
    }

    /**
     * Turns "RT-1A2B3C4D", "1a2b3c4d" or a full UUID into a SQL LIKE prefix
     * containing only hex characters. The phone check still gates the result.
     */
    static String prefix(String reference) {
        String compact = reference == null
                ? ""
                : reference.replaceAll("[^0-9a-fA-F]", "").toLowerCase(Locale.ROOT);
        if (compact.length() < MIN_PREFIX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Enter the booking reference from your confirmation, for example RT-1A2B3C4D.");
        }
        return compact + "%";
    }

    /** Compares the last 10 digits so "+91 98765 43210" matches "9876543210". */
    static boolean phoneMatches(String storedPhone, String suppliedPhone) {
        String stored = digits(storedPhone);
        String supplied = digits(suppliedPhone);
        return supplied.length() >= 10
                && (stored.endsWith(supplied) || supplied.endsWith(stored));
    }

    static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }
}
