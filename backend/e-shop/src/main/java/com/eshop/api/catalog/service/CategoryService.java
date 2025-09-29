package com.eshop.api.catalog.service;

import com.eshop.api.catalog.dto.CategoryCreateRequest;
import com.eshop.api.catalog.dto.CategoryResponse;
import com.eshop.api.catalog.model.Category;
import com.eshop.api.catalog.repository.CategoryRepository;
import com.eshop.api.exception.CategoryAlreadyExistsException;
import com.eshop.api.exception.CategoryNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponse> getAllCategories() {
        List<Category> categories = categoryRepository.findAll(Sort.by(Sort.Direction.ASC, "displayOrder", "name"));
        return categories.stream()
            .map(this::toResponse)
            .toList();
    }

    public CategoryResponse getCategoryBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
            .orElseThrow(() -> new CategoryNotFoundException(slug));
        return toResponse(category);
    }

    @Transactional
    public CategoryResponse createCategory(CategoryCreateRequest request) {
        if (categoryRepository.existsBySlug(request.getSlug())) {
            throw new CategoryAlreadyExistsException(request.getSlug());
        }

        Category parent = null;
        if (request.getParentCategoryId() != null) {
            parent = categoryRepository.findById(request.getParentCategoryId())
                .orElseThrow(() -> new CategoryNotFoundException(request.getParentCategoryId()));
        }

        Category category = Category.builder()
            .name(request.getName())
            .slug(request.getSlug())
            .parentCategory(parent)
            .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
            .active(request.getActive() != null ? request.getActive() : Boolean.TRUE)
            .build();

        Category saved = categoryRepository.save(category);
        return toResponse(saved);
    }

    private CategoryResponse toResponse(Category category) {
        Integer parentId = category.getParentCategory() != null ? category.getParentCategory().getId() : null;
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .slug(category.getSlug())
            .displayOrder(category.getDisplayOrder())
            .active(category.getActive())
            .parentCategoryId(parentId)
            .createdAt(category.getCreatedAt())
            .build();
    }
}
