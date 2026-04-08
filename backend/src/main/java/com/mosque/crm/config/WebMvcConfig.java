package com.mosque.crm.config;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.mosque.crm.multitenancy.TenantInterceptor;
import com.mosque.crm.subscription.SubscriptionEnforcementInterceptor;

/**
 * Web MVC configuration that registers interceptors.
 * - LocaleInterceptor: Sets user's locale based on Accept-Language header
 * - TenantInterceptor: Enables the Hibernate organization filter per request
 * - SubscriptionEnforcementInterceptor: Blocks requests for inactive subscriptions
 */
@Component
public class WebMvcConfig implements WebMvcConfigurer {

    private final TenantInterceptor tenantInterceptor;
    private final LocaleInterceptor localeInterceptor;
    private final SubscriptionEnforcementInterceptor subscriptionEnforcementInterceptor;

    public WebMvcConfig(TenantInterceptor tenantInterceptor,
                        LocaleInterceptor localeInterceptor,
                        SubscriptionEnforcementInterceptor subscriptionEnforcementInterceptor) {
        this.tenantInterceptor = tenantInterceptor;
        this.localeInterceptor = localeInterceptor;
        this.subscriptionEnforcementInterceptor = subscriptionEnforcementInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Locale interceptor runs first to set the locale for the request
        registry.addInterceptor(localeInterceptor)
                .addPathPatterns("/**");

        // Tenant interceptor runs second to enable the organization filter
        registry.addInterceptor(tenantInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/auth/**");

        // Subscription enforcement runs third (after tenant context is set)
        registry.addInterceptor(subscriptionEnforcementInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/auth/**", "/me/**", "/subscription/**", "/admin/subscription/**");
    }
}
