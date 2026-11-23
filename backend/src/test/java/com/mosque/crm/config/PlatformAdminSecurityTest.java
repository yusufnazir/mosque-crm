package com.mosque.crm.config;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.mosque.crm.controller.SchedulerController;
import com.mosque.crm.controller.WhatsAppController;
import com.mosque.crm.multitenancy.TenantInterceptor;
import com.mosque.crm.scheduler.SchedulerService;
import com.mosque.crm.security.JwtRequestFilter;
import com.mosque.crm.security.JwtUtil;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.WahaClient;
import com.mosque.crm.service.WahaSettingsService;
import com.mosque.crm.service.WhatsAppOutboundService;
import com.mosque.crm.service.WhatsAppWebhookService;
import com.mosque.crm.subscription.SubscriptionEnforcementInterceptor;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = {SchedulerController.class, WhatsAppController.class},
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {WebMvcConfig.class, TenantInterceptor.class, SubscriptionEnforcementInterceptor.class}))
@Import({SecurityConfig.class, JwtRequestFilter.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class PlatformAdminSecurityTest {

    @Autowired private MockMvc mvc;
    @MockBean private UserDetailsService userDetailsService;
    @MockBean private JwtUtil jwtUtil;
    @MockBean private SchedulerService schedulerService;
    @MockBean private AuthorizationService authorizationService;
    @MockBean private WhatsAppOutboundService outboundService;
    @MockBean private WhatsAppWebhookService webhookService;
    @MockBean private WahaClient wahaClient;
    @MockBean private WahaSettingsService wahaSettingsService;

    @Test
    @WithMockUser(authorities = {"ADMIN", "scheduler.view", "scheduler.manage", "whatsapp.view", "whatsapp.manage"})
    void tenantAdminCannotAccessPlatformEndpointsEvenWithPermissions() throws Exception {
        for (String path : List.of("/schedulers", "/schedulers/job", "/whatsapp", "/whatsapp/messages/42",
                "/whatsapp/settings")) {
            for (HttpMethod method : List.of(HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE)) {
                mvc.perform(request(method, path)).andExpect(status().isForbidden());
            }
        }
    }

    @Test
    @WithMockUser(authorities = "SUPER_ADMIN")
    void platformAdminCanAccessBothFeatures() throws Exception {
        when(authorizationService.hasPermission("scheduler.view")).thenReturn(true);
        when(schedulerService.list()).thenReturn(List.of());
        when(wahaClient.getSessionStatus()).thenReturn("WORKING");

        mvc.perform(get("/schedulers")).andExpect(status().isOk());
        mvc.perform(get("/whatsapp/session")).andExpect(status().isOk());
    }

    @Test
    void webhookRemainsPublicButRequiresItsSharedSecret() throws Exception {
        when(webhookService.isWebhookConfigured()).thenReturn(true);
        when(webhookService.isAuthorized("valid")).thenReturn(true);

        mvc.perform(post("/whatsapp/webhook").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/whatsapp/webhook").header("X-Webhook-Token", "valid")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        verify(webhookService).isAuthorized("valid");
    }
}
