package com.eshop.api.catalog.recommendation.service;

import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductImage;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.catalog.recommendation.client.RecommendationClient;
import com.eshop.api.catalog.recommendation.dto.ModelRecommendationItem;
import com.eshop.api.catalog.recommendation.dto.ModelRecommendationResponse;
import com.eshop.api.catalog.recommendation.dto.ProductRecommendationResponse;
import com.eshop.api.catalog.repository.ProductImageRepository;
import com.eshop.api.catalog.repository.ProductVariantRepository;
import com.eshop.api.exception.InvalidRecommendationRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductRecommendationServiceTest {

    @Mock
    private RecommendationClient recommendationClient;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @InjectMocks
    private ProductRecommendationService productRecommendationService;

    @Captor
    private ArgumentCaptor<List<UUID>> idsCaptor;

    private UUID queryVariantId;
    private UUID variantIdA;
    private UUID variantIdB;
    private UUID productId;

    @BeforeEach
    void setUp() {
        queryVariantId = UUID.randomUUID();
        variantIdA = UUID.randomUUID();
        variantIdB = UUID.randomUUID();
        productId = UUID.randomUUID();
    }

    @Test
    void shouldReturnProductLevelRecommendationsWithPrimaryImage() {
        Product product = Product.builder()
            .id(productId)
            .name("Test Product")
            .slug("test-product")
            .build();

        ProductVariant variantA = ProductVariant.builder()
            .id(variantIdA)
            .product(product)
            .price(new BigDecimal("79.00"))
            .build();

        ProductVariant variantB = ProductVariant.builder()
            .id(variantIdB)
            .product(product)
            .price(new BigDecimal("89.00"))
            .build();

        ModelRecommendationResponse clientResponse = ModelRecommendationResponse.builder()
            .queryVariantId(queryVariantId)
            .recommendations(List.of(
                ModelRecommendationItem.builder().variantId(variantIdA).similarityScore(0.92).build(),
                ModelRecommendationItem.builder().variantId(variantIdB).similarityScore(0.85).build()
            ))
            .fromCache(Boolean.TRUE)
            .responseTimeMs(0.4)
            .totalResults(2)
            .build();

        when(recommendationClient.fetchRecommendations(queryVariantId, 5)).thenReturn(clientResponse);
        when(productVariantRepository.findByIdIn(anyCollection())).thenReturn(List.of(variantA, variantB));

        ProductImage primaryImage = ProductImage.builder()
            .imageUrl("https://cdn.local/primary.jpg")
            .primary(true)
            .build();
        ProductImage fallbackImage = ProductImage.builder()
            .imageUrl("https://cdn.local/fallback.jpg")
            .primary(false)
            .build();

        when(productImageRepository.findByProductIdOrderByDisplayOrder(productId))
            .thenReturn(List.of(primaryImage, fallbackImage));

        ProductRecommendationResponse response = productRecommendationService.getRecommendations(queryVariantId, null);

        assertThat(response.getRecommendations()).hasSize(1);
        assertThat(response.getRecommendations().get(0).getProductId()).isEqualTo(productId);
        assertThat(response.getRecommendations().get(0).getVariantId()).isEqualTo(variantIdA);
        assertThat(response.getRecommendations().get(0).getImageUrl()).isEqualTo("https://cdn.local/primary.jpg");
        assertThat(response.getRecommendations().get(0).getSimilarityScore()).isEqualTo(0.92);
        assertThat(response.getTotalResults()).isEqualTo(1);

        verify(productVariantRepository).findByIdIn(idsCaptor.capture());
        assertThat(idsCaptor.getValue()).containsExactly(variantIdA, variantIdB);
    }

    @Test
    void shouldReturnEmptyListWhenModelReturnsUnknownVariants() {
        ModelRecommendationResponse clientResponse = ModelRecommendationResponse.builder()
            .queryVariantId(queryVariantId)
            .recommendations(List.of(ModelRecommendationItem.builder().variantId(variantIdA).build()))
            .build();

        when(recommendationClient.fetchRecommendations(queryVariantId, 5)).thenReturn(clientResponse);
        when(productVariantRepository.findByIdIn(anyCollection())).thenReturn(List.of());

        ProductRecommendationResponse response = productRecommendationService.getRecommendations(queryVariantId, null);

        assertThat(response.getRecommendations()).isEmpty();
        assertThat(response.getTotalResults()).isZero();
    }

    @Test
    void shouldValidateLimitParameter() {
        assertThrows(InvalidRecommendationRequestException.class,
            () -> productRecommendationService.getRecommendations(queryVariantId, 0));

        assertThrows(InvalidRecommendationRequestException.class,
            () -> productRecommendationService.getRecommendations(queryVariantId, 21));
    }
}
