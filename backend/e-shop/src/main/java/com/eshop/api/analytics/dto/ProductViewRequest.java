package com.eshop.api.analytics.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;

import java.util.UUID;

public record ProductViewRequest(
    UUID sessionId,
    UUID variantId,
    JsonNode metadata
) {
    public JsonNode metadataOrEmpty() {
        return metadata == null || metadata.isNull()
            ? JsonNodeFactory.instance.objectNode()
            : metadata;
    }
}
