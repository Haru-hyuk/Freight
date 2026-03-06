package com.freight.backend.service;

import com.freight.backend.dto.inquiry.InquiryAnswerRequest;
import com.freight.backend.dto.inquiry.InquiryCreateRequest;
import com.freight.backend.dto.inquiry.InquiryResponse;
import com.freight.backend.entity.Inquiry;
import com.freight.backend.entity.Shipper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.InquiryRepository;
import com.freight.backend.repository.ShipperRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final ShipperRepository shipperRepository;
    private final JdbcTemplate jdbcTemplate;
    private volatile Boolean driverInquiryRequiresShipperId;

    @Transactional
    public InquiryResponse createByShipper(Long shipperId, InquiryCreateRequest request) {
        Inquiry saved = inquiryRepository.save(Inquiry.builder()
                .shipperId(shipperId)
                .writerType(Inquiry.WriterType.SHIPPER)
                .title(request.getTitle())
                .content(request.getContent())
                .status(Inquiry.Status.OPEN)
                .build());
        return InquiryResponse.from(saved);
    }

    @Transactional
    public InquiryResponse createByDriver(Long driverId, InquiryCreateRequest request) {
        Long shipperIdCompat = null;
        if (isDriverInquiryShipperIdRequired()) {
            shipperIdCompat = shipperRepository.findFirstByOrderByShipperIdAsc()
                    .map(Shipper::getShipperId)
                    .orElse(driverId);
            log.warn("Driver inquiry uses legacy shipper_id fallback. driverId={}, fallbackShipperId={}", driverId, shipperIdCompat);
        }

        Inquiry saved = inquiryRepository.save(Inquiry.builder()
                .shipperId(shipperIdCompat)
                .driverId(driverId)
                .writerType(Inquiry.WriterType.DRIVER)
                .title(request.getTitle())
                .content(request.getContent())
                .status(Inquiry.Status.OPEN)
                .build());
        return InquiryResponse.from(saved);
    }

    private boolean isDriverInquiryShipperIdRequired() {
        if (driverInquiryRequiresShipperId != null) {
            return driverInquiryRequiresShipperId;
        }
        synchronized (this) {
            if (driverInquiryRequiresShipperId != null) {
                return driverInquiryRequiresShipperId;
            }
            try {
                String isNullable = jdbcTemplate.queryForObject(
                        """
                                SELECT IS_NULLABLE
                                  FROM information_schema.columns
                                 WHERE table_schema = DATABASE()
                                   AND table_name = 'inquiries'
                                   AND column_name = 'shipper_id'
                                """,
                        String.class
                );
                driverInquiryRequiresShipperId = !"YES".equalsIgnoreCase(isNullable);
            } catch (RuntimeException e) {
                log.warn("Unable to inspect inquiries.shipper_id nullability. fallback assumes nullable. cause={}", e.getMessage());
                driverInquiryRequiresShipperId = false;
            }
        }
        return driverInquiryRequiresShipperId;
    }

    @Transactional(readOnly = true)
    public List<InquiryResponse> getMyInquiries(Long shipperId) {
        return inquiryRepository.findByShipperIdOrderByCreatedAtDesc(shipperId)
                .stream()
                .map(InquiryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InquiryResponse> getDriverInquiries(Long driverId) {
        return inquiryRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream()
                .map(InquiryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InquiryResponse> getAllForAdmin() {
        return inquiryRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(InquiryResponse::from)
                .toList();
    }

    @Transactional
    public InquiryResponse answerByAdmin(Long adminId, Long inquiryId, InquiryAnswerRequest request) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        inquiry.answerByAdmin(adminId, request.getAnswer());
        return InquiryResponse.from(inquiry);
    }
}
