package com.mosque.crm.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mosque.crm.dto.ExcelImportResult;
import com.mosque.crm.service.ExcelImportService;

@RestController
@RequestMapping("/admin/import")
@CrossOrigin(origins = "*")
public class ExcelImportController {

    private final ExcelImportService excelImportService;

    public ExcelImportController(ExcelImportService excelImportService) {
        this.excelImportService = excelImportService;
    }

    @PostMapping("/excel")
    public ResponseEntity<ExcelImportResult> importFromExcel(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Check if the file is an Excel file
        String contentType = file.getContentType();
        String fileName = file.getOriginalFilename();

        if (contentType == null ||
            (!contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
             !contentType.equals("application/vnd.ms-excel") &&
             !(fileName != null && (fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls"))))) {
            return ResponseEntity.badRequest().build();
        }

        ExcelImportResult result = excelImportService.importFromExcel(file);
        return ResponseEntity.ok(result);
    }
}