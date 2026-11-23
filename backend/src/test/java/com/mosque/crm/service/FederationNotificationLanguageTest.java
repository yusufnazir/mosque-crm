package com.mosque.crm.service;

import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.OrganizationPartnership;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.UserRepository;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FederationNotificationLanguageTest {
    @Mock private EmailService emailService;
    @Mock private UserRepository userRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private ConfigurationService configurationService;
    @Mock private UserNotificationService userNotificationService;
    @Mock private AuthorizationService authorizationService;
    @Mock private MessageLanguageService messageLanguageService;
    @InjectMocks private FederationNotificationService service;

    @Test
    void invitationUsesEachRecipientsLanguageInsteadOfSendersLocale() {
        Organization member = new Organization("Member");
        member.setId(1L);
        member.setHandle("member");
        Organization parent = new Organization("Parent");
        parent.setId(2L);
        User dutch = new User();
        dutch.setId(10L);
        dutch.setEmail("dutch@example.invalid");
        User english = new User();
        english.setId(11L);
        english.setEmail("english@example.invalid");
        OrganizationPartnership partnership = new OrganizationPartnership();
        partnership.setMemberOrganizationId(1L);
        partnership.setParentOrganizationId(2L);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(member));
        when(organizationRepository.findById(2L)).thenReturn(Optional.of(parent));
        when(configurationService.getAppName()).thenReturn("App");
        when(configurationService.getFrontendProtocol()).thenReturn("https");
        when(configurationService.getFrontendBaseDomain()).thenReturn("example.invalid");
        when(userRepository.findAdminUsers(1L)).thenReturn(List.of(dutch, english));
        when(messageLanguageService.resolve(10L, 1L)).thenReturn("nl");
        when(messageLanguageService.resolve(11L, 1L)).thenReturn("en");
        when(authorizationService.withoutOrganizationFilter(any()))
                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(0)).get());

        service.notifyPartnershipInvite(partnership);

        verify(emailService).sendFederationAdminNotificationEmail(eq("dutch@example.invalid"),
                eq("App - Uitnodiging voor partnerschap van Parent"), any(), any(), any(), any(), any(), eq("nl"));
        verify(emailService).sendFederationAdminNotificationEmail(eq("english@example.invalid"),
                eq("App - Partnership invitation from Parent"), any(), any(), any(), any(), any(), eq("en"));
    }
}
