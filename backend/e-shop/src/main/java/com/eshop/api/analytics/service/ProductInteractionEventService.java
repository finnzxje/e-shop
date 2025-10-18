package com.eshop.api.analytics.service;

import com.eshop.api.analytics.enums.InteractionType;
import com.eshop.api.analytics.model.ProductInteractionEvent;
import com.eshop.api.analytics.repository.ProductInteractionEventRepository;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.user.User;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Consumer;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductInteractionEventService {

    private final ProductInteractionEventRepository repository;

    @Transactional
    public void recordInteraction(User user,
                                  Product product,
                                  ProductVariant variant,
                                  InteractionType type,
                                  Consumer<ObjectNode> metadataCustomizer) {
        record(user, product, variant, type, metadataCustomizer);
    }

    @Transactional
    public void recordInteraction(User user,
                                  Product product,
                                  ProductVariant variant,
                                  InteractionType type) {
        record(user, product, variant, type, null);
    }

    @Transactional
    public void recordInteraction(User user,
                                  Product product,
                                  InteractionType type,
                                  Consumer<ObjectNode> metadataCustomizer) {
        record(user, product, null, type, metadataCustomizer);
    }

    @Transactional
    public void recordInteraction(User user,
                                  Product product,
                                  InteractionType type) {
        record(user, product, null, type, null);
    }

    private void record(User user,
                        Product product,
                        ProductVariant variant,
                        InteractionType type,
                        Consumer<ObjectNode> metadataCustomizer) {
        if (product == null) {
            log.warn("Skipping interaction logging because product is null for type {}", type);
            return;
        }

        ObjectNode metadata = JsonNodeFactory.instance.objectNode();
        if (metadataCustomizer != null) {
            metadataCustomizer.accept(metadata);
        }

        ProductInteractionEvent event = ProductInteractionEvent.builder()
            .user(user)
            .product(product)
            .variant(variant)
            .interactionType(type)
            .metadata(metadata)
            .build();

        repository.save(event);
    }
}
