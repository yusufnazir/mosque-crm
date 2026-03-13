package com.mosque.crm.config;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Spring MVC interceptor that sets the user's locale based on the Accept-Language header.
 * 
 * This interceptor runs for every request and extracts the locale from the Accept-Language
 * header, then sets it in the LocaleContextHolder so that services can access the user's
 * preferred language for internationalization.
 * 
 * Supported locales: en, nl
 * Default locale: en (if no Accept-Language header or invalid value)
 */
@Component
public class LocaleInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(LocaleInterceptor.class);
    private static final String DEFAULT_LOCALE = "en";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String acceptLanguage = request.getHeader("Accept-Language");
        
        if (acceptLanguage != null && !acceptLanguage.isBlank()) {
            try {
                // Parse the first language tag from Accept-Language header
                // Format: "en-US,en;q=0.9,nl;q=0.8" -> extract "en"
                String languageTag = acceptLanguage.split(",")[0].split("-")[0].trim();
                Locale locale = Locale.forLanguageTag(languageTag);
                LocaleContextHolder.setLocale(locale);
                log.debug("Set locale to {} for request {}", languageTag, request.getRequestURI());
            } catch (Exception e) {
                log.warn("Failed to parse Accept-Language header '{}', using default locale", acceptLanguage);
                LocaleContextHolder.setLocale(Locale.forLanguageTag(DEFAULT_LOCALE));
            }
        } else {
            // No header, use default
            LocaleContextHolder.setLocale(Locale.forLanguageTag(DEFAULT_LOCALE));
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        // Clean up to prevent memory leaks
        LocaleContextHolder.resetLocaleContext();
    }
}
