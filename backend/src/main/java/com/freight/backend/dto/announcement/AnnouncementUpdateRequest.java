package com.freight.backend.dto.announcement;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnnouncementUpdateRequest {
    private String title;
    private String content;
    private Boolean isPinned;
    private Boolean publish;
}
