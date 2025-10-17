package com.eshop.api.order.service;

import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.order.dto.AddressRequest;
import com.eshop.api.order.dto.AddressResponse;
import com.eshop.api.order.exception.AddressNotFoundException;
import com.eshop.api.order.model.Address;
import com.eshop.api.order.repository.AddressRepository;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AddressResponse> listAddresses(String email) {
        User user = resolveUser(email);
        return addressRepository.findByUser_IdOrderByCreatedAtDesc(user.getId()).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public AddressResponse getAddress(String email, UUID addressId) {
        User user = resolveUser(email);
        Address address = addressRepository.findByIdAndUser_Id(addressId, user.getId())
            .orElseThrow(() -> new AddressNotFoundException(addressId));
        return toResponse(address);
    }

    public AddressResponse createAddress(String email, AddressRequest request) {
        User user = resolveUser(email);
        Address address = new Address();
        address.setUser(user);
        applyRequest(address, request, true);

        Address saved = addressRepository.save(address);
        log.info("Created address {} for user {}", saved.getId(), user.getId());
        return toResponse(saved);
    }

    public AddressResponse updateAddress(String email, UUID addressId, AddressRequest request) {
        User user = resolveUser(email);
        Address address = addressRepository.findByIdAndUser_Id(addressId, user.getId())
            .orElseThrow(() -> new AddressNotFoundException(addressId));

        applyRequest(address, request, false);
        Address saved = addressRepository.save(address);
        log.info("Updated address {} for user {}", saved.getId(), user.getId());
        return toResponse(saved);
    }

    public void deleteAddress(String email, UUID addressId) {
        User user = resolveUser(email);
        Address address = addressRepository.findByIdAndUser_Id(addressId, user.getId())
            .orElseThrow(() -> new AddressNotFoundException(addressId));
        addressRepository.delete(address);
        log.info("Deleted address {} for user {}", addressId, user.getId());
    }

    private void applyRequest(Address address, AddressRequest request, boolean isCreate) {
        if (request == null) {
            throw new IllegalArgumentException("Address request must not be null");
        }

        address.setLabel(request.label());
        address.setRecipientName(request.recipientName());
        address.setPhone(request.phone());
        address.setLine1(request.line1());
        address.setLine2(request.line2());
        address.setCity(request.city());
        address.setStateProvince(request.stateProvince());
        address.setPostalCode(request.postalCode());
        address.setCountryCode(request.countryCode());

        if (request.makeDefault()) {
            addressRepository.clearDefaultForUser(address.getUser().getId());
            address.setIsDefault(true);
        } else if (!isCreate && request.isDefault() != null) {
            address.setIsDefault(false);
        } else if (isCreate && address.getIsDefault() == null) {
            address.setIsDefault(Boolean.FALSE);
        }
    }

    private AddressResponse toResponse(Address address) {
        return new AddressResponse(
            address.getId(),
            address.getLabel(),
            address.getRecipientName(),
            address.getPhone(),
            address.getLine1(),
            address.getLine2(),
            address.getCity(),
            address.getStateProvince(),
            address.getPostalCode(),
            address.getCountryCode(),
            address.getIsDefault(),
            address.getCreatedAt(),
            address.getUpdatedAt()
        );
    }

    private User resolveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidJwtException("Authentication is required for address operations");
        }
        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }
}
