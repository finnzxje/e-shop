package com.eshop.api.order.model;

import com.eshop.api.cart.model.Cart;
import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentMethod;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
    name = "orders",
    uniqueConstraints = {
        @UniqueConstraint(name = "orders_order_number_key", columnNames = {"order_number"})
    },
    indexes = {
        @Index(name = "idx_orders_user", columnList = "user_id"),
        @Index(name = "idx_orders_status", columnList = "status"),
        @Index(name = "idx_orders_payment_status", columnList = "payment_status"),
        @Index(name = "idx_orders_placed_at", columnList = "placed_at")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "order_number", nullable = false, unique = true, length = 32)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id")
    private Cart cart;

    @Column(name = "status", nullable = false, columnDefinition = "order_status_enum")
    @Builder.Default
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "payment_status", nullable = false, columnDefinition = "payment_status_enum")
    @Builder.Default
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "payment_method", nullable = false, columnDefinition = "payment_method_enum")
    @Builder.Default
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod = PaymentMethod.UNKNOWN;

    @Column(name = "currency", nullable = false, length = 8)
    private String currency;

    @Column(name = "subtotal_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotalAmount;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "shipping_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingAmount;

    @Column(name = "tax_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "notes")
    private String notes;

    @Column(name = "shipping_method", length = 64)
    private String shippingMethod;

    @Column(name = "shipping_tracking_number", length = 128)
    private String shippingTrackingNumber;

    @CreationTimestamp
    @Column(name = "placed_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant placedAt = Instant.now();

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "fulfilled_at")
    private Instant fulfilledAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipping_address_id")
    private OrderAddress shippingAddress;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "billing_address_id")
    private OrderAddress billingAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<OrderItem> items = new HashSet<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<OrderStatusHistory> statusHistory = new HashSet<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<PaymentTransaction> paymentTransactions = new HashSet<>();

    public void addItem(OrderItem item) {
        if (item == null) {
            return;
        }
        items.add(item);
        item.setOrder(this);
    }

    public void addStatusHistory(OrderStatusHistory history) {
        if (history == null) {
            return;
        }
        statusHistory.add(history);
        history.setOrder(this);
    }

    public void addPaymentTransaction(PaymentTransaction transaction) {
        if (transaction == null) {
            return;
        }
        paymentTransactions.add(transaction);
        transaction.setOrder(this);
    }
}
