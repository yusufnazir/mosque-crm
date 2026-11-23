package com.mosque.crm.service;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mosque.crm.config.WahaProperties;
import com.mosque.crm.dto.WhatsAppEnqueueRequest;
import com.mosque.crm.dto.WhatsAppEnqueueResultDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.repository.OrganizationRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountActivationNotifierTest {
    @Mock private WhatsAppOutboundService outboundService;
    @Mock private WahaClient wahaClient;
    @Mock private WahaSettingsService wahaSettings;
    @Mock private OrganizationRepository organizationRepository;
    @InjectMocks private AccountActivationNotifier notifier;

    @Test
    void dutchActivationMessageIsQueuedWithCorrectOrganization() {
        Organization organization = new Organization("Example");
        WhatsAppEnqueueResultDTO result = new WhatsAppEnqueueResultDTO();
        result.setQueued(1);
        when(wahaSettings.effective()).thenReturn(new WahaProperties());
        when(wahaClient.isConfigured()).thenReturn(true);
        when(wahaClient.getSessionStatus()).thenReturn("WORKING");
        when(organizationRepository.findById(3L)).thenReturn(Optional.of(organization));
        when(outboundService.enqueue(any(WhatsAppEnqueueRequest.class), isNull())).thenReturn(result);

        assertThat(notifier.deliver("Name", "+5978542222", "member", "https://example.invalid/token",
                false, "nl", 3L)).isEqualTo(AccountActivationNotifier.Channel.WHATSAPP);

        ArgumentCaptor<WhatsAppEnqueueRequest> request = ArgumentCaptor.forClass(WhatsAppEnqueueRequest.class);
        verify(outboundService).enqueue(request.capture(), isNull());
        assertThat(request.getValue().getTemplate())
                .contains("Example heeft een ledenaccount", "Uw gebruikersnaam: member", "https://example.invalid/token");
    }
}
