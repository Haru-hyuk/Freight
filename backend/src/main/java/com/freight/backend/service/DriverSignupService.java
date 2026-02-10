package com.freight.backend.service;

import com.freight.backend.dto.driver.DriverSignupRequest;
import com.freight.backend.dto.driver.DriverSignupResponse;
import com.freight.backend.entity.Driver;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DriverSignupService {

    private final DriverRepository driverRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public DriverSignupResponse signup(DriverSignupRequest req) {
        if (driverRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        Driver driver = Driver.builder()
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .name(req.getName())
                .phone(req.getPhone())
                .address(req.getAddress())
                .addressDetail(req.getAddressDetail())
                .bankName(req.getBankName())
                .bankAccount(req.getBankAccount())
                .licenseVerified(false)
                .build();

        Driver saved = driverRepository.save(driver);
        return new DriverSignupResponse(saved.getDriverId());
    }
}
