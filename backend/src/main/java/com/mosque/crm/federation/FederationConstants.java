package com.mosque.crm.federation;

import java.util.List;

/**
 * Constants for federation partnerships and shareable modules.
 */
public final class FederationConstants {

    public static final String MODULE_BUSINESS_DIRECTORY = "business_directory";
    public static final String MODULE_PUBLIC_EVENTS = "public_events";

    public static final List<String> SHAREABLE_MODULES = List.of(
            MODULE_BUSINESS_DIRECTORY,
            MODULE_PUBLIC_EVENTS
    );

    private FederationConstants() {
    }
}
