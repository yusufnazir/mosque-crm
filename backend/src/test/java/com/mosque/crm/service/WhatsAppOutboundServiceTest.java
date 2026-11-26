package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import com.mosque.crm.entity.WhatsAppOutboundMessage;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.WhatsAppInboundRepository;
import com.mosque.crm.repository.WhatsAppOptOutRepository;
import com.mosque.crm.repository.WhatsAppOutboundRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhatsAppOutboundServiceTest {

    @Mock private WhatsAppOutboundRepository outboundRepository;
    @Mock private WhatsAppOptOutRepository optOutRepository;
    @Mock private WhatsAppInboundRepository inboundRepository;
    @Mock private PersonRepository personRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private SpintaxResolver spintaxResolver;
    @Mock private WhatsAppRateLimiter rateLimiter;
    @Mock private WahaSettingsService wahaSettings;
    @Mock private WhatsAppChannelService channelService;
    @Mock private AuthorizationService authorizationService;
    @InjectMocks private WhatsAppOutboundService service;

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void deletingQueuedMessageCancelsAndRemovesItsContents() {
        WhatsAppOutboundMessage message = message(WhatsAppOutboundMessage.Status.QUEUED);
        allowAccess(message);

        service.deleteMessage(42L);

        assertThat(message.getStatus()).isEqualTo(WhatsAppOutboundMessage.Status.CANCELLED);
        assertThat(message.getDeletedAt()).isNotNull();
        assertThat(message.getRecipientPhone()).isEmpty();
        assertThat(message.getRecipientName()).isNull();
        assertThat(message.getRenderedBody()).isEmpty();
        assertThat(message.getLastError()).isNull();
        assertThat(message.getWaMessageId()).isNull();
        verify(outboundRepository).save(message);
    }

    @Test
    void deletingSentMessagePreservesSentStatusAndTimeForRateLimits() {
        WhatsAppOutboundMessage message = message(WhatsAppOutboundMessage.Status.SENT);
        LocalDateTime sentAt = LocalDateTime.of(2026, 1, 5, 12, 0);
        message.setSentAt(sentAt);
        allowAccess(message);

        service.deleteMessage(42L);

        assertThat(message.getStatus()).isEqualTo(WhatsAppOutboundMessage.Status.SENT);
        assertThat(message.getSentAt()).isEqualTo(sentAt);
        assertThat(message.getDeletedAt()).isNotNull();
        assertThat(message.getRecipientPhone()).isEmpty();
        assertThat(message.getRenderedBody()).isEmpty();
        verify(outboundRepository).save(message);
    }

    @Test
    void cannotDeleteMessageClaimedByDispatcher() {
        WhatsAppOutboundMessage message = message(WhatsAppOutboundMessage.Status.SENDING);
        allowAccess(message);

        assertThatThrownBy(() -> service.deleteMessage(42L))
                .isInstanceOf(IllegalStateException.class);
        assertThat(message.getDeletedAt()).isNull();
        assertThat(message.getRenderedBody()).isEqualTo("Hello");
        verify(outboundRepository, never()).save(message);
    }

    @Test
    void deleteUsesActiveOrganizationForLockedLookup() {
        TenantContext.setCurrentOrganizationId(7L);
        when(authorizationService.hasPermission("whatsapp.manage")).thenReturn(true);
        when(outboundRepository.findVisibleForUpdate(42L, 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteMessage(42L))
                .isInstanceOf(IllegalArgumentException.class);
        verify(outboundRepository).findVisibleForUpdate(42L, 7L);
    }

    @Test
    void deleteRequiresManagePermission() {
        when(authorizationService.hasPermission("whatsapp.manage")).thenReturn(false);

        assertThatThrownBy(() -> service.deleteMessage(42L))
                .isInstanceOf(AccessDeniedException.class);
        verify(outboundRepository, never()).findVisibleForUpdate(42L, null);
    }

    @Test
    void deleteRejectsMessageOutsideUsersOrganizationEvenWithoutTenantContext() {
        WhatsAppOutboundMessage message = message(WhatsAppOutboundMessage.Status.QUEUED);
        when(authorizationService.hasPermission("whatsapp.manage")).thenReturn(true);
        when(outboundRepository.findVisibleForUpdate(42L, null)).thenReturn(Optional.of(message));
        when(authorizationService.hasPermissionForOrganization("whatsapp.manage", 7L)).thenReturn(false);

        assertThatThrownBy(() -> service.deleteMessage(42L))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(message.getDeletedAt()).isNull();
        verify(outboundRepository, never()).save(message);
    }

    @Test
    void cancellingAlsoUsesLockedLookupAndCannotChangeSendingMessage() {
        WhatsAppOutboundMessage message = message(WhatsAppOutboundMessage.Status.SENDING);
        allowAccess(message);

        assertThatThrownBy(() -> service.cancel(42L))
                .isInstanceOf(IllegalStateException.class);
        verify(outboundRepository).findVisibleForUpdate(42L, 7L);
        verify(outboundRepository, never()).save(message);
    }

    @Test
    void allQueueFiltersUseVisibleMessageQueries() {
        PageRequest page = PageRequest.of(0, 20);
        when(outboundRepository.findByDeletedAtIsNullOrderByCreatedAtDesc(page)).thenReturn(Page.empty());
        when(outboundRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("SENT", page))
                .thenReturn(Page.empty());
        when(outboundRepository.findByCampaignIdAndDeletedAtIsNullOrderByCreatedAtAsc("campaign", page))
                .thenReturn(Page.empty());

        service.list(null, null, page);
        service.list("sent", null, page);
        service.list(null, "campaign", page);

        verify(outboundRepository).findByDeletedAtIsNullOrderByCreatedAtDesc(page);
        verify(outboundRepository).findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("SENT", page);
        verify(outboundRepository).findByCampaignIdAndDeletedAtIsNullOrderByCreatedAtAsc("campaign", page);
    }

    private WhatsAppOutboundMessage message(String status) {
        WhatsAppOutboundMessage message = new WhatsAppOutboundMessage();
        message.setId(42L);
        message.setOrganizationId(7L);
        message.setStatus(status);
        message.setRecipientPhone("+5971234567");
        message.setRecipientName("Recipient");
        message.setRenderedBody("Hello");
        message.setLastError("Error");
        message.setWaMessageId("message-id");
        return message;
    }

    private void allowAccess(WhatsAppOutboundMessage message) {
        TenantContext.setCurrentOrganizationId(7L);
        when(authorizationService.hasPermission("whatsapp.manage")).thenReturn(true);
        when(outboundRepository.findVisibleForUpdate(42L, 7L)).thenReturn(Optional.of(message));
        when(authorizationService.hasPermissionForOrganization("whatsapp.manage", 7L)).thenReturn(true);
    }
}
