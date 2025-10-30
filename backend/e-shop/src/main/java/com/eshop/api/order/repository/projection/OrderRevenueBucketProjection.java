package com.eshop.api.order.repository.projection;

import java.math.BigDecimal;
import java.time.Instant;

public interface OrderRevenueBucketProjection {

    Instant getBucketStart();

    Long getOrderCount();

    BigDecimal getGrossTotal();
}
