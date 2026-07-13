package com.mosque.crm.demo;

import java.util.ArrayList;
import java.util.List;

/**
 * Fixed Suriname/Dutch demo federation credentials shown in Settings → Demo data.
 * Parent federation: RBSIS Paramaribo (handle {@code rbsis-paramaribo}).
 */
public final class DemoDataCatalog {

    public static final String SHARED_PASSWORD = "DemoPass123!";

    public static final String PARENT_HANDLE = "rbsis-paramaribo";

    public static final String PARENT_PREFIX = "rbsis";

    private DemoDataCatalog() {
    }

    public record Credential(
            String organization,
            String handle,
            String role,
            String username,
            String email,
            String password
    ) {
    }

    public static List<Credential> credentials() {
        List<Credential> list = new ArrayList<>();
        list.add(new Credential(
                "RBSIS Paramaribo (federatie)",
                PARENT_HANDLE,
                "Admin",
                "demo_" + PARENT_PREFIX + "_admin",
                "demo-" + PARENT_PREFIX + "-admin@demo.local",
                SHARED_PASSWORD));
        addMosque(list, "Moskee Baitur Rochim", "demo-baiturrochim", "baitur");
        addMosque(list, "Moskee Darul Iman", "demo-daruliman", "darul");
        addMosque(list, "Moskee An-Nur", "demo-annur", "annur");
        return list;
    }

    private static void addMosque(List<Credential> list, String orgName, String handle, String prefix) {
        list.add(new Credential(orgName, handle, "Admin", "demo_" + prefix + "_admin",
                "demo-" + prefix + "-admin@demo.local", SHARED_PASSWORD));
        list.add(new Credential(orgName, handle, "Penningmeester", "demo_" + prefix + "_treasurer",
                "demo-" + prefix + "-treasurer@demo.local", SHARED_PASSWORD));
        list.add(new Credential(orgName, handle, "Lid (portaal)", "demo_" + prefix + "_member",
                "demo-" + prefix + "-member@demo.local", SHARED_PASSWORD));
    }
}
