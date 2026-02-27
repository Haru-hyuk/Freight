package com.freight.backend.service;

import com.freight.backend.dto.shipper.ShipperAddressItemResponse;
import com.freight.backend.dto.shipper.ShipperAddressUpsertRequest;
import com.freight.backend.entity.ShipperAddress;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.ShipperAddressRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShipperAddressService {

    private final ShipperAddressRepository shipperAddressRepository;

    @Transactional(readOnly = true)
    public List<ShipperAddressItemResponse> listByShipper(Long shipperId) {
        return shipperAddressRepository.findByShipperIdOrderByIsDefaultDescUpdatedAtDescCreatedAtDesc(shipperId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ShipperAddressItemResponse create(Long shipperId, ShipperAddressUpsertRequest req) {
        String label = normalize(req.getLabel());
        String address = normalize(req.getAddress());
        String addressDetail = normalizeNullable(req.getAddressDetail());
        String memo = normalizeNullable(req.getMemo());
        boolean makeDefault = Boolean.TRUE.equals(req.getIsDefault());

        if (makeDefault) {
            shipperAddressRepository.clearDefaultByShipperId(shipperId);
        }

        ShipperAddress created = shipperAddressRepository.save(
                ShipperAddress.builder()
                        .shipperId(shipperId)
                        .label(label)
                        .isDefault(makeDefault)
                        .address(address)
                        .addressDetail(addressDetail)
                        .memo(memo)
                        .build()
        );

        ensureOneDefault(shipperId);
        return toResponse(created);
    }

    @Transactional
    public ShipperAddressItemResponse update(Long shipperId, Long addressId, ShipperAddressUpsertRequest req) {
        ShipperAddress existing = shipperAddressRepository.findByShipperAddressIdAndShipperId(addressId, shipperId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        String label = normalize(req.getLabel());
        String address = normalize(req.getAddress());
        String addressDetail = normalizeNullable(req.getAddressDetail());
        String memo = normalizeNullable(req.getMemo());
        boolean makeDefault = Boolean.TRUE.equals(req.getIsDefault());

        if (makeDefault) {
            shipperAddressRepository.clearDefaultByShipperId(shipperId);
        }

        existing.updateFrom(label, makeDefault, address, addressDetail, memo);
        ShipperAddress updated = shipperAddressRepository.save(existing);

        ensureOneDefault(shipperId);
        return toResponse(updated);
    }

    @Transactional
    public void delete(Long shipperId, Long addressId) {
        ShipperAddress existing = shipperAddressRepository.findByShipperAddressIdAndShipperId(addressId, shipperId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        shipperAddressRepository.delete(existing);
        ensureOneDefault(shipperId);
    }

    private void ensureOneDefault(Long shipperId) {
        List<ShipperAddress> all = shipperAddressRepository.findByShipperIdOrderByIsDefaultDescUpdatedAtDescCreatedAtDesc(shipperId);
        if (all.isEmpty()) {
            return;
        }
        boolean hasDefault = all.stream().anyMatch(item -> Boolean.TRUE.equals(item.getIsDefault()));
        if (!hasDefault) {
            ShipperAddress target = all.get(0);
            target.setDefault(true);
            shipperAddressRepository.save(target);
        }
    }

    private ShipperAddressItemResponse toResponse(ShipperAddress entity) {
        return new ShipperAddressItemResponse(
                String.valueOf(entity.getShipperAddressId()),
                entity.getLabel(),
                Boolean.TRUE.equals(entity.getIsDefault()),
                entity.getAddress(),
                entity.getAddressDetail(),
                entity.getMemo()
        );
    }

    private String normalize(String input) {
        if (input == null) {
            return "";
        }
        return input.trim();
    }

    private String normalizeNullable(String input) {
        if (input == null) {
            return "";
        }
        return input.trim();
    }
}
