package com.eshop.api.cart.service;

import com.eshop.api.cart.dto.AddCartItemRequest;
import com.eshop.api.cart.dto.CartItemResponse;
import com.eshop.api.cart.dto.CartResponse;
import com.eshop.api.cart.dto.UpdateCartItemRequest;
import com.eshop.api.cart.model.Cart;
import com.eshop.api.cart.model.CartItem;
import com.eshop.api.cart.repository.CartItemRepository;
import com.eshop.api.cart.repository.CartRepository;
import com.eshop.api.catalog.dto.ColorResponse;
import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.model.Color;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.catalog.repository.ProductVariantRepository;
import com.eshop.api.exception.CartItemNotFoundException;
import com.eshop.api.exception.CartNotFoundException;
import com.eshop.api.exception.InsufficientInventoryException;
import com.eshop.api.exception.InvalidCartItemQuantityException;
import com.eshop.api.exception.ProductVariantNotFoundException;
import com.eshop.api.exception.ProductVariantUnavailableException;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;

    @Transactional
    public CartResponse addItem(String email, AddCartItemRequest request) {
        User user = findUser(email);
        Cart cart = getOrCreateCart(user);

        UUID variantId = request.getVariantId();
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new ProductVariantNotFoundException(variantId));

        ensureVariantAvailable(variant);

        int requestedQuantity = Optional.ofNullable(request.getQuantity()).orElse(1);
        if (requestedQuantity <= 0) {
            throw new InvalidCartItemQuantityException();
        }

        CartItem existingItem = findItemByVariant(cart, variant.getId());
        if (existingItem == null) {
            validateStock(variant, requestedQuantity);
            CartItem newItem = CartItem.builder()
                .cart(cart)
                .variant(variant)
                .quantity(requestedQuantity)
                .build();
            cart.addItem(newItem);
        } else {
            int currentQuantity = Optional.ofNullable(existingItem.getQuantity()).orElse(0);
            int newQuantity = currentQuantity + requestedQuantity;
            validateStock(variant, newQuantity);
            existingItem.setQuantity(newQuantity);
        }

        cartRepository.save(cart);
        Cart refreshed = cartRepository.findByUser_Id(user.getId())
            .orElseThrow(() -> new CartNotFoundException(user.getId()));

        return mapToResponse(refreshed);
    }

    @Transactional
    public CartResponse updateItem(String email, UUID itemId, UpdateCartItemRequest request) {
        User user = findUser(email);
        CartItem cartItem = cartItemRepository.findByIdAndCart_User_Id(itemId, user.getId())
            .orElseThrow(() -> new CartItemNotFoundException(itemId));

        int quantity = Optional.ofNullable(request.getQuantity()).orElse(0);
        if (quantity <= 0) {
            throw new InvalidCartItemQuantityException();
        }

        ProductVariant variant = cartItem.getVariant();
        ensureVariantAvailable(variant);
        validateStock(variant, quantity);

        cartItem.setQuantity(quantity);

        cartItemRepository.save(cartItem);
        Cart refreshed = cartRepository.findByUser_Id(user.getId())
            .orElseThrow(() -> new CartNotFoundException(user.getId()));
        return mapToResponse(refreshed);
    }

    @Transactional
    public CartResponse removeItem(String email, UUID itemId) {
        User user = findUser(email);
        CartItem cartItem = cartItemRepository.findByIdAndCart_User_Id(itemId, user.getId())
            .orElseThrow(() -> new CartItemNotFoundException(itemId));

        Cart cart = cartItem.getCart();
        cart.removeItem(cartItem);
        cartItemRepository.delete(cartItem);

        cartRepository.save(cart);
        Cart refreshed = cartRepository.findByUser_Id(user.getId())
            .orElseThrow(() -> new CartNotFoundException(user.getId()));
        return mapToResponse(refreshed);
    }

    @Transactional
    public CartResponse clearCart(String email) {
        User user = findUser(email);
        Cart cart = cartRepository.findByUser_Id(user.getId())
            .orElseThrow(() -> new CartNotFoundException(user.getId()));

        if (!cart.getItems().isEmpty()) {
            // Copy to avoid ConcurrentModification exceptions
            List<CartItem> itemsCopy = new ArrayList<>(cart.getItems());
            itemsCopy.forEach(cart::removeItem);
        }

        cartRepository.save(cart);
        Cart refreshed = cartRepository.findByUser_Id(user.getId())
            .orElse(cart);
        return mapToResponse(refreshed);
    }

    @Transactional
    public CartResponse getCart(String email) {
        User user = findUser(email);
        Cart cart = cartRepository.findByUser_Id(user.getId())
            .orElseGet(() -> cartRepository.save(Cart.builder()
                .user(user)
                .build()));
        return mapToResponse(cart);
    }

    private User findUser(String email) {
        if (email == null || email.isBlank()) {
            throw new UsernameNotFoundException("User email is required for cart operations");
        }
        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    private Cart getOrCreateCart(User user) {
        return cartRepository.findByUser_Id(user.getId())
            .orElseGet(() -> cartRepository.save(Cart.builder()
                .user(user)
                .build()));
    }

    private CartItem findItemByVariant(Cart cart, UUID variantId) {
        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            return null;
        }
        return cart.getItems().stream()
            .filter(item -> item.getVariant() != null && variantId.equals(item.getVariant().getId()))
            .findFirst()
            .orElse(null);
    }

    private void ensureVariantAvailable(ProductVariant variant) {
        if (variant == null) {
            throw new ProductVariantUnavailableException(null, "Variant reference is missing");
        }
        if (!Boolean.TRUE.equals(variant.getActive())) {
            throw new ProductVariantUnavailableException(variant.getId(), "Variant is inactive");
        }
        Product product = variant.getProduct();
        if (product == null || product.getStatus() != ProductStatus.ACTIVE) {
            throw new ProductVariantUnavailableException(variant.getId(), "Product is not active");
        }
        if (variant.getQuantityInStock() == null || variant.getQuantityInStock() <= 0) {
            throw new ProductVariantUnavailableException(variant.getId(), "Variant is out of stock");
        }
    }

    private void validateStock(ProductVariant variant, int requestedQuantity) {
        int available = Optional.ofNullable(variant.getQuantityInStock()).orElse(0);
        if (requestedQuantity > available) {
            throw new InsufficientInventoryException(variant.getId(), requestedQuantity, available);
        }
    }

    private BigDecimal resolvePrice(ProductVariant variant) {
        if (variant != null && variant.getPrice() != null) {
            return variant.getPrice();
        }
        Product product = variant != null ? variant.getProduct() : null;
        if (product != null && product.getBasePrice() != null) {
            return product.getBasePrice();
        }
        return BigDecimal.ZERO;
    }

    private CartResponse mapToResponse(Cart cart) {
        if (cart == null) {
            return CartResponse.builder()
                .id(null)
                .userId(null)
                .totalItems(0)
                .totalQuantity(0)
                .subtotal(BigDecimal.ZERO)
                .createdAt(null)
                .updatedAt(null)
                .items(List.of())
                .build();
        }

        List<CartItem> cartItems = cart.getItems() == null ? List.of() : cart.getItems().stream()
            .sorted(Comparator.comparing(CartItem::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();

        List<CartItemResponse> itemResponses = cartItems.stream()
            .map(this::mapCartItem)
            .toList();

        int totalItems = itemResponses.size();
        int totalQuantity = cartItems.stream()
            .map(CartItem::getQuantity)
            .filter(q -> q != null && q > 0)
            .mapToInt(Integer::intValue)
            .sum();

        BigDecimal subtotal = cartItems.stream()
            .map(item -> resolvePrice(item.getVariant())
                .multiply(BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 0)))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder()
            .id(cart.getId())
            .userId(cart.getUser() != null ? cart.getUser().getId() : null)
            .totalItems(totalItems)
            .totalQuantity(totalQuantity)
            .subtotal(subtotal)
            .createdAt(cart.getCreatedAt())
            .updatedAt(cart.getUpdatedAt())
            .items(itemResponses)
            .build();
    }

    private CartItemResponse mapCartItem(CartItem item) {
        ProductVariant variant = item.getVariant();
        Product product = variant != null ? variant.getProduct() : null;

        BigDecimal unitPrice = resolvePrice(variant);
        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 0));

        return CartItemResponse.builder()
            .id(item.getId())
            .variantId(variant != null ? variant.getId() : null)
            .productId(product != null ? product.getId() : null)
            .productName(product != null ? product.getName() : null)
            .productSlug(product != null ? product.getSlug() : null)
            .variantSku(variant != null ? variant.getVariantSku() : null)
            .size(variant != null ? variant.getSize() : null)
            .fit(variant != null ? variant.getFit() : null)
            .color(mapColor(variant != null ? variant.getColor() : null))
            .quantity(item.getQuantity())
            .unitPrice(unitPrice)
            .lineTotal(lineTotal)
            .inStock(isVariantAvailableForQuantity(variant, item.getQuantity()))
            .availableQuantity(variant != null ? variant.getQuantityInStock() : null)
            .build();
    }

    private boolean isVariantAvailableForQuantity(ProductVariant variant, Integer quantity) {
        if (variant == null) {
            return false;
        }
        if (!Boolean.TRUE.equals(variant.getActive())) {
            return false;
        }
        Product product = variant.getProduct();
        if (product == null || product.getStatus() != ProductStatus.ACTIVE) {
            return false;
        }
        int required = quantity == null ? 0 : quantity;
        int available = Optional.ofNullable(variant.getQuantityInStock()).orElse(0);
        return available >= required && available > 0;
    }

    private ColorResponse mapColor(Color color) {
        if (color == null) {
            return null;
        }
        return ColorResponse.builder()
            .id(color.getId())
            .code(color.getCode())
            .name(color.getName())
            .hex(color.getHex())
            .build();
    }
}
