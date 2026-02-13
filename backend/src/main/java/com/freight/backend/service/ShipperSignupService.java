package com.freight.backend.service;

import com.freight.backend.dto.shipper.ShipperSignupRequest;
import com.freight.backend.dto.shipper.ShipperSignupResponse;
import com.freight.backend.entity.Shipper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.odcloud.OdcloudClient;
import com.freight.backend.odcloud.OdcloudValidateRequest;
import com.freight.backend.odcloud.OdcloudValidateResponse;
import com.freight.backend.repository.ShipperRepository;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ShipperSignupService {

    private final ShipperRepository shipperRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final OdcloudClient odcloudClient;

    public ShipperSignupResponse signup(ShipperSignupRequest req) {
        if (shipperRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        OdcloudValidateRequest.Business business = new OdcloudValidateRequest.Business(
                req.getBizRegNo(),
                req.getOpenDate(),
                req.getOwnerName(),
                null,
                req.getCompanyName(),
                null,
                null,
                null,
                req.getAddress()
        );
        OdcloudValidateResponse response = odcloudClient.validateBusiness(business);
        if (response == null
                || response.getData() == null
                || response.getData().isEmpty()
                || response.getData().get(0) == null
                || !"01".equals(response.getData().get(0).getValid())) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        Shipper shipper = Shipper.builder()
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .name(req.getName())
                .companyName(req.getCompanyName())
                .phone(req.getPhone())
                .address(req.getAddress())
                .addressDetail(req.getAddressDetail())
                .bizRegNo(req.getBizRegNo())
                .bizPhone(req.getBizPhone())
                .totalOrders(0)
                .prepaidBalance(BigDecimal.ZERO)
                .build();

        Shipper saved = shipperRepository.save(shipper);
        return new ShipperSignupResponse(saved.getShipperId());
    }
}
