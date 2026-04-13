package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.BatchThreadRequest;
import com.mosque.crm.dto.ConversationSummaryDTO;
import com.mosque.crm.dto.InboxPageDTO;
import com.mosque.crm.dto.MessageDTO;
import com.mosque.crm.dto.SendMessageDTO;
import com.mosque.crm.entity.Message;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserMemberLink;
import com.mosque.crm.repository.MessageRepository;
import com.mosque.crm.repository.UserMemberLinkRepository;
import com.mosque.crm.repository.UserRepository;

@Service
@Transactional
public class MessageService {

    private static final Logger log = LoggerFactory.getLogger(MessageService.class);

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserMemberLinkRepository userMemberLinkRepository;

    public MessageService(
            MessageRepository messageRepository,
            UserRepository userRepository,
            UserMemberLinkRepository userMemberLinkRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.userMemberLinkRepository = userMemberLinkRepository;
    }

    private static final java.util.regex.Pattern RE_PREFIX_PATTERN =
            java.util.regex.Pattern.compile("^(RE: |Re: |re: )*");

    @Transactional(readOnly = true)
    public InboxPageDTO getInbox(Long userId, Long orgId, int page, int size) {
        int offset = page * size;
        List<Message> latestMessages = messageRepository.findLatestMessagePerConversationPaged(userId, orgId, size, offset);
        long totalElements = messageRepository.countConversationThreads(userId, orgId);
        int totalPages = (int) Math.ceil((double) totalElements / size);

        List<ConversationSummaryDTO> content = new ArrayList<>();
        for (Message msg : latestMessages) {
            Long otherUserId = userId.equals(msg.getSenderId()) ? msg.getRecipientId() : msg.getSenderId();
            String baseSubject = stripRePrefix(msg.getSubject());

            long unreadCount = messageRepository.countUnreadByThread(userId, otherUserId, baseSubject);

            ConversationSummaryDTO summary = new ConversationSummaryDTO();
            summary.setOtherUserId(otherUserId);
            summary.setOtherUserName(getUserDisplayName(otherUserId));
            summary.setBaseSubject(baseSubject);
            summary.setLastMessage(toDTO(msg));
            summary.setUnreadCount(unreadCount);

            content.add(summary);
        }

        return new InboxPageDTO(content, totalElements, totalPages, page, size);
    }

    @Transactional
    public List<MessageDTO> getConversation(Long currentUserId, Long otherUserId, String baseSubject) {
        List<Message> messages;
        if (baseSubject != null && !baseSubject.isEmpty()) {
            messages = messageRepository.findConversationBySubject(currentUserId, otherUserId, baseSubject);
            // Mark incoming messages in this thread as read
            messageRepository.markThreadAsRead(currentUserId, otherUserId, baseSubject);
        } else {
            messages = messageRepository.findConversation(currentUserId, otherUserId);
            // Mark all incoming messages as read (legacy fallback)
            messageRepository.markConversationAsRead(currentUserId, otherUserId);
        }

        return messages.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public MessageDTO sendMessage(Long senderId, Long orgId, SendMessageDTO dto) {
        Message message = new Message();
        message.setOrganizationId(orgId);
        message.setSenderId(senderId);
        message.setRecipientId(dto.getRecipientId());
        message.setSubject(dto.getSubject());
        message.setBody(dto.getBody());
        message.setRead(false);
        message.setReplyToId(dto.getReplyToId());

        Message saved = messageRepository.save(message);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return messageRepository.countByRecipientIdAndReadFalse(userId);
    }

    public void markRead(Long messageId, Long currentUserId) {
        messageRepository.findById(messageId).ifPresent(msg -> {
            if (currentUserId.equals(msg.getRecipientId())) {
                msg.setRead(true);
                messageRepository.save(msg);
            }
        });
    }

    public void markThreadAsRead(Long userId, Long otherUserId, String baseSubject) {
        messageRepository.markThreadAsRead(userId, otherUserId, baseSubject);
    }

    public void deleteThread(Long userId, Long otherUserId, String baseSubject) {
        messageRepository.deleteThread(userId, otherUserId, baseSubject);
    }

    public void batchMarkAsRead(Long userId, List<BatchThreadRequest.ThreadKey> threads) {
        for (BatchThreadRequest.ThreadKey t : threads) {
            messageRepository.markThreadAsRead(userId, t.getOtherUserId(), t.getBaseSubject());
        }
    }

    public void batchDelete(Long userId, List<BatchThreadRequest.ThreadKey> threads) {
        for (BatchThreadRequest.ThreadKey t : threads) {
            messageRepository.deleteThread(userId, t.getOtherUserId(), t.getBaseSubject());
        }
    }

    private String getUserDisplayName(Long userId) {
        if (userId == null) {
            return "System";
        }
        Optional<UserMemberLink> linkOpt = userMemberLinkRepository.findByUserId(userId);
        if (linkOpt.isPresent() && linkOpt.get().getPerson() != null) {
            com.mosque.crm.entity.Person person = linkOpt.get().getPerson();
            String firstName = person.getFirstName() != null ? person.getFirstName() : "";
            String lastName = person.getLastName() != null ? person.getLastName() : "";
            String fullName = (firstName + " " + lastName).trim();
            if (!fullName.isEmpty()) {
                return fullName;
            }
        }
        return userRepository.findById(userId)
                .map(User::getUsername)
                .orElse("Unknown");
    }

    private MessageDTO toDTO(Message m) {
        MessageDTO dto = new MessageDTO();
        dto.setId(m.getId());
        dto.setOrganizationId(m.getOrganizationId());
        dto.setSenderId(m.getSenderId());
        dto.setSenderName(getUserDisplayName(m.getSenderId()));
        dto.setRecipientId(m.getRecipientId());
        dto.setRecipientName(getUserDisplayName(m.getRecipientId()));
        dto.setSubject(m.getSubject());
        dto.setBody(m.getBody());
        dto.setRead(m.isRead());
        dto.setReplyToId(m.getReplyToId());
        dto.setCreatedAt(m.getCreatedAt());
        return dto;
    }

    private String stripRePrefix(String subject) {
        if (subject == null) return "";
        return RE_PREFIX_PATTERN.matcher(subject).replaceFirst("");
    }
}
