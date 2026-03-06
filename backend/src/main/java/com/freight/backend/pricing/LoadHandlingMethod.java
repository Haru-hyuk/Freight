package com.freight.backend.pricing;

public enum LoadHandlingMethod {
    SHIPPER,
    DRIVER;

    public static LoadHandlingMethod from(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.contains(":")) {
            normalized = normalized.substring(0, normalized.indexOf(':'));
        }
        return switch (normalized) {
            case "SHIPPER" -> SHIPPER;
            case "DRIVER" -> DRIVER;
            default -> null;
        };
    }
}
