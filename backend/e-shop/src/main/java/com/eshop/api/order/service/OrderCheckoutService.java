package com.eshop.api.order.service;

import com.eshop.api.cart.model.Cart;
import com.eshop.api.cart.model.CartItem;
import com.eshop.api.cart.repository.CartRepository;
import com.eshop.api.exception.CartNotFoundException;
import com.eshop.api.order.dto.CheckoutAddressRequest;
import com.eshop.api.order.dto.CheckoutItemResponse;
import com.eshop.api.order.dto.CheckoutRequest;
import com.eshop.api.order.dto.CheckoutResponse;
import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentMethod;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.enums.OrderAddressType;
import com.eshop.api.order.exception.AddressNotFoundException;
import com.eshop.api.order.exception.CartEmptyException;
import com.eshop.api.order.exception.CheckoutValidationException;
import com.eshop.api.order.model.Address;
import com.eshop.api.order.model.Order;
import com.eshop.api.order.model.OrderAddress;
import com.eshop.api.order.model.OrderItem;
import com.eshop.api.order.model.OrderStatusHistory;
import com.eshop.api.order.model.PaymentTransaction;
import com.eshop.api.order.repository.AddressRepository;
import com.eshop.api.order.repository.OrderAddressRepository;
import com.eshop.api.order.repository.OrderRepository;
import com.eshop.api.order.repository.OrderStatusHistoryRepository;
import com.eshop.api.order.repository.PaymentTransactionRepository;
import com.eshop.api.payment.dto.VnPayInitResponse;
import com.eshop.api.payment.service.VnPayPaymentService;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.user.User;
import org.springframework.stereotype.Service;
import com.eshop.api.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderCheckoutService {

    private static final String DEFAULT_CURRENCY = "USD";

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final AddressRepository addressRepository;
    private final OrderRepository orderRepository;
    private final OrderAddressRepository orderAddressRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final VnPayPaymentService vnPayPaymentService;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public CheckoutResponse checkout(String email, CheckoutRequest request, String clientIp) {
        User user = findUser(email);
        Cart cart = cartRepository.findByUser_Id(user.getId())
            .orElseThrow(() -> new CartNotFoundException(user.getId()));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new CartEmptyException();
        }

        Address address = resolveAddress(user, request);
        CheckoutAddressRequest addressPayload = request.getAddress();
        if (address == null && addressPayload == null) {
            throw new CheckoutValidationException("Either addressId or address payload must be provided");
        }

        MonetaryBreakdown breakdown = calculateMonetaryBreakdown(cart.getItems(), request);

        Order order = Order.builder()
            .orderNumber(generateOrderNumber())
            .user(user)
            .cart(cart)
            .status(OrderStatus.AWAITING_PAYMENT)
            .paymentStatus(PaymentStatus.PENDING)
            .paymentMethod(PaymentMethod.CARD)
            .currency(DEFAULT_CURRENCY)
            .subtotalAmount(breakdown.subtotal())
            .discountAmount(breakdown.discount())
            .shippingAmount(breakdown.shipping())
            .taxAmount(breakdown.tax())
            .totalAmount(breakdown.total())
            .notes(request.getNotes())
            .shippingMethod(request.getShippingMethod())
            .placedAt(Instant.now())
            .build();

        order = orderRepository.save(order);

        OrderAddress shippingSnapshot = buildOrderAddress(order, address, addressPayload, OrderAddressType.SHIPPING);
        shippingSnapshot = orderAddressRepository.save(shippingSnapshot);
        order.setShippingAddress(shippingSnapshot);

        List<CheckoutItemResponse> itemResponses = new ArrayList<>();
        for (CartItem cartItem : cart.getItems()) {
            OrderItem orderItem = buildOrderItem(order, cartItem);
            order.addItem(orderItem);
            itemResponses.add(mapToItemResponse(orderItem));
        }

        order = orderRepository.save(order);

        OrderStatusHistory history = OrderStatusHistory.builder()
            .order(order)
            .status(order.getStatus())
            .paymentStatus(order.getPaymentStatus())
            .changedBy(user)
            .comment("Order created and pending VNPay payment")
            .build();
        order.addStatusHistory(history);
        orderStatusHistoryRepository.save(history);

        PaymentTransaction transaction = PaymentTransaction.builder()
            .order(order)
            .provider("VNPAY")
            .idempotencyKey(order.getOrderNumber())
            .amount(order.getTotalAmount())
            .currency(order.getCurrency())
            .status(PaymentStatus.PENDING)
            .method(PaymentMethod.CARD)
            .build();
        order.addPaymentTransaction(transaction);
        transaction = paymentTransactionRepository.save(transaction);

//        clearCart(cart);

        VnPayInitResponse vnPayInit = vnPayPaymentService.createPaymentUrl(order, transaction, clientIp);

        return CheckoutResponse.builder()
            .orderId(order.getId())
            .orderNumber(order.getOrderNumber())
            .status(order.getStatus())
            .paymentStatus(order.getPaymentStatus())
            .subtotalAmount(order.getSubtotalAmount())
            .discountAmount(order.getDiscountAmount())
            .shippingAmount(order.getShippingAmount())
            .taxAmount(order.getTaxAmount())
            .totalAmount(order.getTotalAmount())
            .currency(order.getCurrency())
            .totalAmountVnd(vnPayInit.getAmountVnd())
            .paymentProvider("VNPAY")
            .paymentUrl(vnPayInit.getPaymentUrl())
            .paymentUrlExpiresAt(vnPayInit.getExpiresAt())
            .items(itemResponses)
            .build();
    }

    private User findUser(String email) {
        if (email == null || email.isBlank()) {
            throw new CheckoutValidationException("Authenticated user email is required");
        }
        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new CheckoutValidationException("User not found for email: " + email));
    }

    private Address resolveAddress(User user, CheckoutRequest request) {
        if (request.getAddressId() != null) {
            return addressRepository.findByIdAndUser_Id(request.getAddressId(), user.getId())
                .orElseThrow(() -> new AddressNotFoundException(request.getAddressId()));
        }

        CheckoutAddressRequest payload = request.getAddress();
        if (payload == null) {
            return null;
        }

        if (!request.isSaveAddress()) {
            return null;
        }

        Address address = Address.builder()
            .user(user)
            .label(payload.getLabel())
            .recipientName(payload.getRecipientName())
            .phone(payload.getPhone())
            .line1(payload.getLine1())
            .line2(payload.getLine2())
            .city(payload.getCity())
            .stateProvince(payload.getStateProvince())
            .postalCode(payload.getPostalCode())
            .countryCode(payload.getCountryCode())
            .isDefault(false)
            .build();

        return addressRepository.save(address);
    }

    private OrderAddress buildOrderAddress(Order order, Address address, CheckoutAddressRequest payload,
                                           OrderAddressType type) {
        String recipientName;
        String phone;
        String line1;
        String line2;
        String city;
        String stateProvince;
        String postalCode;
        String countryCode;
        String instructions;

        if (address != null) {
            recipientName = address.getRecipientName();
            phone = address.getPhone();
            line1 = address.getLine1();
            line2 = address.getLine2();
            city = address.getCity();
            stateProvince = address.getStateProvince();
            postalCode = address.getPostalCode();
            countryCode = address.getCountryCode();
            instructions = payload != null ? payload.getInstructions() : null;
        } else if (payload != null) {
            recipientName = payload.getRecipientName();
            phone = payload.getPhone();
            line1 = payload.getLine1();
            line2 = payload.getLine2();
            city = payload.getCity();
            stateProvince = payload.getStateProvince();
            postalCode = payload.getPostalCode();
            countryCode = payload.getCountryCode();
            instructions = payload.getInstructions();
        } else {
            throw new CheckoutValidationException("Address details are required");
        }

        return OrderAddress.builder()
            .order(order)
            .address(address)
            .addressType(type)
            .recipientName(recipientName)
            .phone(phone)
            .line1(line1)
            .line2(line2)
            .city(city)
            .stateProvince(stateProvince)
            .postalCode(postalCode)
            .countryCode(countryCode)
            .instructions(instructions)
            .build();
    }

    private OrderItem buildOrderItem(Order order, CartItem cartItem) {
        ProductVariant variant = cartItem.getVariant();
        if (variant == null) {
            throw new CheckoutValidationException("Cart item is missing product variant");
        }
        if (variant.getPrice() == null) {
            throw new CheckoutValidationException("Variant price is not configured for variant: " + variant.getId());
        }

        int quantity = Objects.requireNonNullElse(cartItem.getQuantity(), 0);
        if (quantity <= 0) {
            throw new CheckoutValidationException("Cart item quantity must be greater than zero");
        }

        BigDecimal unitPrice = variant.getPrice().setScale(2, RoundingMode.HALF_UP);
        BigDecimal discount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("source", "cart");

        return OrderItem.builder()
            .order(order)
            .product(variant.getProduct())
            .variant(variant)
            .quantity(quantity)
            .unitPrice(unitPrice)
            .discountAmount(discount)
            .totalAmount(lineTotal)
            .currency(order.getCurrency())
            .metadata(metadata)
            .build();
    }

    private CheckoutItemResponse mapToItemResponse(OrderItem orderItem) {
        return CheckoutItemResponse.builder()
            .productId(orderItem.getProduct() != null ? orderItem.getProduct().getId() : null)
            .variantId(orderItem.getVariant() != null ? orderItem.getVariant().getId() : null)
            .quantity(orderItem.getQuantity())
            .unitPrice(orderItem.getUnitPrice())
            .discountAmount(orderItem.getDiscountAmount())
            .totalAmount(orderItem.getTotalAmount())
            .currency(orderItem.getCurrency())
            .build();
    }

    private MonetaryBreakdown calculateMonetaryBreakdown(Iterable<CartItem> cartItems, CheckoutRequest request) {
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CartItem item : cartItems) {
            ProductVariant variant = item.getVariant();
            if (variant == null || variant.getPrice() == null) {
                throw new CheckoutValidationException("Cart item has no price information");
            }
            int quantity = Objects.requireNonNullElse(item.getQuantity(), 0);
            if (quantity <= 0) {
                throw new CheckoutValidationException("Cart item quantity must be greater than zero");
            }
            BigDecimal lineTotal = variant.getPrice()
                .multiply(BigDecimal.valueOf(quantity))
                .setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineTotal);
        }

        BigDecimal shipping = sanitizeAmount(request.getShippingAmount());
        BigDecimal discount = sanitizeAmount(request.getDiscountAmount());
        BigDecimal tax = sanitizeAmount(request.getTaxAmount());

        if (discount.compareTo(subtotal) > 0) {
            throw new CheckoutValidationException("Discount amount cannot exceed subtotal");
        }

        BigDecimal total = subtotal.subtract(discount).add(shipping).add(tax).setScale(2, RoundingMode.HALF_UP);
        return new MonetaryBreakdown(subtotal, discount, shipping, tax, total);
    }

    private BigDecimal sanitizeAmount(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (value.signum() < 0) {
            throw new CheckoutValidationException("Amounts cannot be negative");
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private void clearCart(Cart cart) {
        if (cart.getItems() == null) {
            return;
        }
        List<CartItem> items = new ArrayList<>(cart.getItems());
        for (CartItem item : items) {
            cart.removeItem(item);
        }
        cartRepository.save(cart);
    }

    private String generateOrderNumber() {
        Number sequence = (Number) entityManager.createNativeQuery("select nextval('seq_order_number')").getSingleResult();
        long value = sequence.longValue();
        return String.format("ORD-%08d", value);
    }

    private record MonetaryBreakdown(BigDecimal subtotal, BigDecimal discount, BigDecimal shipping,
                                     BigDecimal tax, BigDecimal total) {
    }
}
