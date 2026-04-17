package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.CommunicationMessageDTO;
import com.mosque.crm.dto.CommunicationTemplateDTO;
import com.mosque.crm.dto.SendMessageRequest;
import com.mosque.crm.entity.CommunicationMessage;
import com.mosque.crm.entity.CommunicationTemplate;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.PersonStatus;
import com.mosque.crm.repository.CommunicationMessageRepository;
import com.mosque.crm.repository.CommunicationTemplateRepository;
import com.mosque.crm.repository.PersonRepository;

@Service
public class CommunicationService {

    private static final Logger log = LoggerFactory.getLogger(CommunicationService.class);

    private final CommunicationMessageRepository messageRepository;
    private final CommunicationTemplateRepository templateRepository;
    private final PersonRepository personRepository;
    private final EmailService emailService;

    public CommunicationService(CommunicationMessageRepository messageRepository,
                                 CommunicationTemplateRepository templateRepository,
                                 PersonRepository personRepository,
                                 EmailService emailService) {
        this.messageRepository = messageRepository;
        this.templateRepository = templateRepository;
        this.personRepository = personRepository;
        this.emailService = emailService;
    }

    // ==================== Messages ====================

    @Transactional
    public CommunicationMessageDTO sendMessage(SendMessageRequest request, Long createdByUserId) {
        List<Person> recipients = resolveRecipients(request.getRecipientType());
        List<String> emailAddresses = recipients.stream()
            .map(Person::getEmail)
            .filter(email -> email != null && !email.isBlank())
            .distinct()
            .collect(Collectors.toList());

        CommunicationMessage message = new CommunicationMessage();
        message.setSubject(request.getSubject());
        message.setBodyHtml(request.getBodyHtml());
        message.setRecipientType(request.getRecipientType());
        message.setTotalRecipients(emailAddresses.size());
        message.setTemplateId(request.getTemplateId());
        message.setCreatedBy(createdByUserId);

        if (emailAddresses.isEmpty()) {
            log.warn("No email addresses found for recipient type: {}", request.getRecipientType());
            message.setStatus("FAILED");
        } else {
            int sent = emailService.sendBulkEmail(emailAddresses, request.getSubject(), request.getBodyHtml());
            if (sent > 0) {
                message.setStatus("SENT");
                message.setSentAt(LocalDateTime.now());
                log.info("Bulk email sent to {} recipients. Subject: {}", sent, request.getSubject());
            } else {
                message.setStatus("FAILED");
                log.error("Bulk email failed for subject: {}", request.getSubject());
            }
        }

        CommunicationMessage saved = messageRepository.save(message);
        return toMessageDTO(saved);
    }

    public Page<CommunicationMessageDTO> listMessages(Pageable pageable) {
        return messageRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toMessageDTO);
    }

    public List<CommunicationMessageDTO> listRecentMessages(int limit) {
        return messageRepository.findTop5ByOrderByCreatedAtDesc().stream()
            .map(this::toMessageDTO)
            .collect(Collectors.toList());
    }

    public Optional<CommunicationMessageDTO> getMessage(Long id) {
        return messageRepository.findById(id).map(this::toMessageDTO);
    }

    // ==================== Templates ====================

    @Transactional
    public CommunicationTemplateDTO createTemplate(CommunicationTemplateDTO dto, Long createdByUserId) {
        CommunicationTemplate template = new CommunicationTemplate();
        template.setName(dto.getName());
        template.setSubject(dto.getSubject());
        template.setBodyHtml(dto.getBodyHtml());
        template.setCategory(dto.getCategory());
        template.setIsDefault(dto.getIsDefault() != null && dto.getIsDefault());
        template.setCreatedBy(createdByUserId);
        return toTemplateDTO(templateRepository.save(template));
    }

    @Transactional
    public CommunicationTemplateDTO updateTemplate(Long id, CommunicationTemplateDTO dto) {
        CommunicationTemplate template = templateRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Template not found: " + id));
        template.setName(dto.getName());
        template.setSubject(dto.getSubject());
        template.setBodyHtml(dto.getBodyHtml());
        template.setCategory(dto.getCategory());
        if (dto.getIsDefault() != null) {
            template.setIsDefault(dto.getIsDefault());
        }
        return toTemplateDTO(templateRepository.save(template));
    }

    @Transactional
    public void deleteTemplate(Long id) {
        templateRepository.deleteById(id);
    }

    public List<CommunicationTemplateDTO> listTemplates() {
        return templateRepository.findAllByOrderByNameAsc().stream()
            .map(this::toTemplateDTO)
            .collect(Collectors.toList());
    }

    public Optional<CommunicationTemplateDTO> getTemplate(Long id) {
        return templateRepository.findById(id).map(this::toTemplateDTO);
    }

    // ==================== Private helpers ====================

    private List<Person> resolveRecipients(String recipientType) {
        if ("ACTIVE_MEMBERS".equals(recipientType)) {
            return personRepository.findByStatus(PersonStatus.ACTIVE);
        }
        // Default: ALL_MEMBERS (all persons with an email address)
        return personRepository.findAll();
    }

    private CommunicationMessageDTO toMessageDTO(CommunicationMessage m) {
        CommunicationMessageDTO dto = new CommunicationMessageDTO();
        dto.setId(m.getId());
        dto.setSubject(m.getSubject());
        dto.setBodyHtml(m.getBodyHtml());
        dto.setRecipientType(m.getRecipientType());
        dto.setRecipientFilterJson(m.getRecipientFilterJson());
        dto.setTotalRecipients(m.getTotalRecipients());
        dto.setStatus(m.getStatus());
        dto.setSentAt(m.getSentAt());
        dto.setTemplateId(m.getTemplateId());
        dto.setCreatedBy(m.getCreatedBy());
        dto.setOrganizationId(m.getOrganizationId());
        dto.setCreatedAt(m.getCreatedAt());
        return dto;
    }

    private CommunicationTemplateDTO toTemplateDTO(CommunicationTemplate t) {
        CommunicationTemplateDTO dto = new CommunicationTemplateDTO();
        dto.setId(t.getId());
        dto.setName(t.getName());
        dto.setSubject(t.getSubject());
        dto.setBodyHtml(t.getBodyHtml());
        dto.setCategory(t.getCategory());
        dto.setIsDefault(t.getIsDefault());
        dto.setCreatedBy(t.getCreatedBy());
        dto.setOrganizationId(t.getOrganizationId());
        dto.setCreatedAt(t.getCreatedAt());
        return dto;
    }
}
