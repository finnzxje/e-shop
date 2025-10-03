package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.Color;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ColorRepository extends JpaRepository<Color, Integer> {

    Optional<Color> findByCode(String code);
}
