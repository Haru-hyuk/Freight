package com.freight.backend.pricing;

public enum LoadHandlingMethod {
    SHIPPER,
    DRIVER;

    public static LoadHandlingMethod from(String value) {
        if (value == null) {
            return null;
        }
        return LoadHandlingMethod.valueOf(value);
    }
}
