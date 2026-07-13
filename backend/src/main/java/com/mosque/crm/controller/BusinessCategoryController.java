package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.BusinessCategoryDTO;
import com.mosque.crm.service.BusinessCategoryService;

/**
 * Global business category reference data (localized).
 */
@RestController
@RequestMapping("/business-categories")
public class BusinessCategoryController {

    private final BusinessCategoryService businessCategoryService;

    public BusinessCategoryController(BusinessCategoryService businessCategoryService) {
        this.businessCategoryService = businessCategoryService;
    }

    @GetMapping
    public ResponseEntity<List<BusinessCategoryDTO>> listActive(
            @RequestParam(value = "locale", required = false, defaultValue = "en") String locale) {
        return ResponseEntity.ok(businessCategoryService.listActive(locale));
    }
}
