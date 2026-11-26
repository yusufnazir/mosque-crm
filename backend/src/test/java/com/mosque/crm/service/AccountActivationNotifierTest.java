package com.mosque.crm.service;

import java.util.Optional;
import java.io.StringReader;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import freemarker.template.Configuration;
import freemarker.template.Template;

import com.mosque.crm.config.WahaProperties;
import com.mosque.crm.dto.WhatsAppEnqueueRequest;
import com.mosque.crm.dto.WhatsAppEnqueueResultDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.WhatsAppChannel;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.waha.WahaClient;
import com.mosque.crm.waha.WahaSessionStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

@ExtendWith(MockitoExtension.class)
class AccountActivationNotifierTest {
    @Mock private WhatsAppOutboundService outboundService;
    @Mock private WahaClient wahaClient;
    @Mock private WahaSettingsService wahaSettings;
    @Mock private WhatsAppChannelService channelService;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private EmailService emails;
    @Mock private ConfigurationService configuration;
    @Mock private MessageLanguageService languages;
    @Spy @InjectMocks private AccountActivationNotifier notifier;

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void welcomeUsesRecipientLanguageAndOnlyClaimsEmailWhenAccepted(boolean accepted) {
        User user = new User();
        user.setId(12L);
        user.setOrganizationId(7L);
        user.setUsername("member@example.com");
        user.setEmail("member@example.com");
        Person person = new Person();
        person.setFirstName("Member");
        person.setLastName("Example");
        when(languages.resolve(12L, 7L)).thenReturn("nl");
        when(configuration.getAppName()).thenReturn("Test CRM");
        when(configuration.getAppBaseUrl()).thenReturn("http://example.test");
        when(emails.sendWelcomeEmail("member@example.com", "Member", "member@example.com",
                "Test CRM", "setup-token", "nl")).thenReturn(accepted);
        doReturn(accepted ? AccountActivationNotifier.Channel.EMAIL : AccountActivationNotifier.Channel.WHATSAPP)
                .when(notifier).deliver(anyString(), anyString(), anyString(), anyString(), anyBoolean(),
                        anyString(), anyLong());

        assertThat(notifier.deliverWelcome(person, user, "setup-token", "+5978123456"))
                .isEqualTo(accepted ? AccountActivationNotifier.Channel.EMAIL : AccountActivationNotifier.Channel.WHATSAPP);
        verify(notifier).deliver("Member Example", "+5978123456", "member@example.com",
                "http://example.test/reset-password?token=setup-token", accepted, "nl", 7L);
    }

    @Test
    void unconfiguredMailServerIsNotReportedAsEmailSuccess() {
        when(configuration.getAppBaseUrl()).thenReturn("http://example.test");
        EmailService service = new EmailService(configuration, mock(Configuration.class));

        assertThat(service.sendWelcomeEmail("member@example.com", "Member", "member@example.com",
                "Test CRM", "setup-token", "en")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(ints = {200, 500})
    void welcomeEmailReportsMailServiceAcceptanceOrFailure(int status) throws Exception {
        when(configuration.getAppBaseUrl()).thenReturn("http://example.test");
        when(configuration.getMailServerHost()).thenReturn("http://mail.example.test");
        Configuration templates = mock(Configuration.class);
        when(templates.getTemplate(anyString())).thenReturn(new Template("welcome",
                new StringReader("Hello ${firstName}, ${setupUrl}"),
                new Configuration(Configuration.VERSION_2_3_32)));
        EmailService service = new EmailService(configuration, templates);
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(requestTo("http://mail.example.test/rest/v1/api/register-mail"))
                .andRespond(withStatus(HttpStatus.valueOf(status)));

        assertThat(service.sendWelcomeEmail("member@example.com", "Member", "member@example.com",
                "Test CRM", "setup-token", "en")).isEqualTo(status == 200);
        server.verify();
    }

    @Test
    void dutchActivationMessageIsQueuedWithCorrectOrganization() {
        Organization organization = new Organization("Example");
        WhatsAppEnqueueResultDTO result = new WhatsAppEnqueueResultDTO();
        result.setQueued(1);
        WhatsAppChannel channel = new WhatsAppChannel();
        channel.setId(5L);
        channel.setLabel("Members");
        channel.setWahaSession("members");
        when(wahaSettings.effective()).thenReturn(new WahaProperties());
        when(wahaClient.isConfigured()).thenReturn(true);
        when(channelService.requireChannel(isNull(), anyString())).thenReturn(channel);
        when(wahaClient.status("members")).thenReturn(WahaSessionStatus.WORKING);
        when(organizationRepository.findById(3L)).thenReturn(Optional.of(organization));
        when(outboundService.enqueue(any(WhatsAppEnqueueRequest.class), isNull())).thenReturn(result);

        assertThat(notifier.deliver("Name", "+5978542222", "member", "https://example.invalid/token",
                false, "nl", 3L)).isEqualTo(AccountActivationNotifier.Channel.WHATSAPP);

        ArgumentCaptor<WhatsAppEnqueueRequest> request = ArgumentCaptor.forClass(WhatsAppEnqueueRequest.class);
        verify(outboundService).enqueue(request.capture(), isNull());
        assertThat(request.getValue().getChannelId()).isEqualTo(5L);
        assertThat(request.getValue().getTemplate())
                .contains("Example heeft een ledenaccount", "Uw gebruikersnaam: member", "https://example.invalid/token");
    }
}
