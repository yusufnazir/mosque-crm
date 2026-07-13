package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.UserNotificationDTO;
import com.mosque.crm.entity.UserNotification;
import com.mosque.crm.repository.UserNotificationRepository;

@Service
public class UserNotificationService {

    private static final Logger log = LoggerFactory.getLogger(UserNotificationService.class);

    private final UserNotificationRepository userNotificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public UserNotificationService(
            UserNotificationRepository userNotificationRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.userNotificationRepository = userNotificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public UserNotificationDTO create(
            Long userId,
            Long organizationId,
            String type,
            String title,
            String body,
            String linkPath) {
        if (userId == null) {
            return null;
        }
        UserNotification notification = new UserNotification();
        notification.setUserId(userId);
        notification.setOrganizationId(organizationId);
        notification.setType(type);
        notification.setTitle(truncate(title, 255));
        notification.setBody(truncate(body, 1000));
        notification.setLinkPath(linkPath);
        UserNotification saved = userNotificationRepository.save(notification);
        UserNotificationDTO dto = toDto(saved);
        pushRealtime(userId, dto);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<UserNotificationDTO> listRecent(Long userId, int limit) {
        int size = Math.min(Math.max(limit, 1), 50);
        return userNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, size))
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return userNotificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public UserNotificationDTO markRead(Long userId, Long notificationId) {
        UserNotification notification = userNotificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found."));
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
            userNotificationRepository.save(notification);
        }
        return toDto(notification);
    }

    @Transactional
    public int markAllRead(Long userId) {
        return userNotificationRepository.markAllRead(userId);
    }

    private void pushRealtime(Long userId, UserNotificationDTO dto) {
        try {
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/topic/notifications",
                    dto);
        } catch (Exception e) {
            log.debug("Could not push notification WS event to user {}: {}", userId, e.getMessage());
        }
    }

    private UserNotificationDTO toDto(UserNotification notification) {
        UserNotificationDTO dto = new UserNotificationDTO();
        dto.setId(notification.getId());
        dto.setType(notification.getType());
        dto.setTitle(notification.getTitle());
        dto.setBody(notification.getBody());
        dto.setLinkPath(notification.getLinkPath());
        dto.setRead(notification.isRead());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= max) {
            return trimmed;
        }
        return trimmed.substring(0, max - 1) + "…";
    }
}
