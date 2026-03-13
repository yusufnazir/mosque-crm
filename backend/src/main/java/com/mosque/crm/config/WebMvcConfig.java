package com.mosque.crm.config;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.mosque.crm.multitenancy.TenantInterceptor;

/**
 * Web MVC configuration that registers interceptors.
 * - LocaleInterceptor: Sets user's locale based on Accept-Language header
 * - TenantInterceptor: Enables the Hibernate mosque filter per request
 */
@Component
public class WebMvcConfig implements WebMvcConfigurer {

    private final TenantInterceptor tenantInterceptor;
    private final LocaleInterceptor localeInterceptor;

    public WebMvcConfig(TenantInterceptor tenantInterceptor, LocaleInterceptor localeInterceptor) {
        this.tenantInterceptor = tenantInterceptor;
        this.localeInterceptor = localeInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Locale interceptor runs first to set the locale for the request
        registry.addInterceptor(localeInterceptor)
                .addPathPatterns("/**");

        // Tenant interceptor runs second to enable the mosque filter
        registry.addInterceptor(tenantInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/auth/**");
    }
}
