package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class PageResponse<T> {
    List<T> content;
    long totalElements;
    int totalPages;
    int page;
    int size;
    boolean hasNext;
    boolean hasPrevious;
}
