package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.BatchThreadRequest;
import com.mosque.crm.dto.ConversationSummaryDTO;
import com.mosque.crm.dto.InboxPageDTO;
import com.mosque.crm.dto.MessageDTO;
import com.mosque.crm.dto.SendMessageDTO;
import com.mosque.crm.dto.WsMessageNotification;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.MessageService;

@RestController
@RequestMapping("/messages")
public class MessageController {

    private static final Logger log = LoggerFactory.getLogger(MessageController.class);

    private final MessageService messageService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageController(MessageService messageService, UserRepository userRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.messageService = messageService;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/inbox")
    public ResponseEntity<?> getInbox(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        Long orgId = currentUser.getSelectedOrganizationId() != null
                ? currentUser.getSelectedOrganizationId()
                : currentUser.getOrganizationId();
        InboxPageDTO inbox = messageService.getInbox(currentUser.getId(), orgId, page, Math.min(size, 100));
        return ResponseEntity.ok(inbox);
    }

    @GetMapping("/conversation/{otherUserId}")
    public ResponseEntity<?> getConversation(@PathVariable Long otherUserId,
                                              @RequestParam(required = false) String subject) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        List<MessageDTO> messages = messageService.getConversation(currentUser.getId(), otherUserId, subject);
        return ResponseEntity.ok(messages);
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(@RequestBody SendMessageDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        Long orgId = currentUser.getSelectedOrganizationId() != null
                ? currentUser.getSelectedOrganizationId()
                : currentUser.getOrganizationId();
        try {
            MessageDTO result = messageService.sendMessage(currentUser.getId(), orgId, dto);

            // Push real-time notification AFTER the transaction has committed
            try {
                long unreadCount = messageService.getUnreadCount(dto.getRecipientId());
                WsMessageNotification notification = new WsMessageNotification(result, unreadCount);
                messagingTemplate.convertAndSendToUser(
                        dto.getRecipientId().toString(),
                        "/topic/messages",
                        notification);
                log.debug("WebSocket notification sent to user {}", dto.getRecipientId());
            } catch (Exception wsEx) {
                log.warn("Failed to send WebSocket notification to user {}: {}",
                        dto.getRecipientId(), wsEx.getMessage());
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount() {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        long count = messageService.getUnreadCount(currentUser.getId());
        Map<String, Long> result = new HashMap<>();
        result.put("count", count);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        messageService.markRead(id, currentUser.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/thread/read")
    public ResponseEntity<?> markThreadAsRead(@RequestParam Long otherUserId,
                                               @RequestParam String subject) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        messageService.markThreadAsRead(currentUser.getId(), otherUserId, subject);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/thread")
    public ResponseEntity<?> deleteThread(@RequestParam Long otherUserId,
                                           @RequestParam String subject) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        messageService.deleteThread(currentUser.getId(), otherUserId, subject);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/batch/read")
    public ResponseEntity<?> batchMarkAsRead(@RequestBody BatchThreadRequest request) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        messageService.batchMarkAsRead(currentUser.getId(), request.getThreads());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/batch/delete")
    public ResponseEntity<?> batchDelete(@RequestBody BatchThreadRequest request) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        messageService.batchDelete(currentUser.getId(), request.getThreads());
        return ResponseEntity.ok().build();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }
}
