package com.freight.backend.service;

import com.freight.backend.dto.inquiry.InquiryAnswerRequest;
import com.freight.backend.dto.inquiry.InquiryCreateRequest;
import com.freight.backend.dto.inquiry.InquiryResponse;
import com.freight.backend.entity.Inquiry;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.InquiryRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;

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
        Inquiry saved = inquiryRepository.save(Inquiry.builder()
                .driverId(driverId)
                .writerType(Inquiry.WriterType.DRIVER)
                .title(request.getTitle())
                .content(request.getContent())
                .status(Inquiry.Status.OPEN)
                .build());
        return InquiryResponse.from(saved);
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
