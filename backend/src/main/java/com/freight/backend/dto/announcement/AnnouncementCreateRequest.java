package com.freight.backend.dto.announcement;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnnouncementCreateRequest {
    private String title;
    private String content;
    private Boolean isPinned;
    private Boolean publish;
}
