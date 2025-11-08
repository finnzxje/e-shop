package com.eshop.api.catalog.admin;

import com.eshop.api.catalog.dto.ColorResponse;
import com.eshop.api.catalog.model.Color;
import com.eshop.api.catalog.repository.ColorRepository;
import com.eshop.api.catalog.service.ProductMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/catalog/colors")
@RequiredArgsConstructor
public class AdminColorController {

    private final ColorRepository colorRepository;
    private final ProductMapper productMapper;

    @GetMapping
    public ResponseEntity<List<ColorResponse>> listColors() {
        List<Color> colors = colorRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
        List<ColorResponse> response = colors.stream()
            .map(productMapper::toColorResponse)
            .toList();
        return ResponseEntity.ok(response);
    }
}
