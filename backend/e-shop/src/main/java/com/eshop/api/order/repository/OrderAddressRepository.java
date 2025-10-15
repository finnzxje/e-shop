package com.eshop.api.order.repository;

import com.eshop.api.order.model.OrderAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OrderAddressRepository extends JpaRepository<OrderAddress, UUID> {
}
