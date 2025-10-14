package com.eshop.api.order.repository;

import com.eshop.api.order.model.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AddressRepository extends JpaRepository<Address, UUID> {

    Optional<Address> findByIdAndUser_Id(UUID id, UUID userId);

    @Modifying
    @Query("update Address a set a.isDefault = false where a.user.id = :userId")
    void clearDefaultForUser(UUID userId);
}
