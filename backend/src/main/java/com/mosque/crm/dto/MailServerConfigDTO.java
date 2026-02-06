package com.mosque.crm.dto;

public class MailServerConfigDTO {
    private String host;
    private String username;
    private String password;
    private String projectUuid;

    public MailServerConfigDTO() {
    }

    public MailServerConfigDTO(String host, String username, String password, String projectUuid) {
        this.host = host;
        this.username = username;
        this.password = password;
        this.projectUuid = projectUuid;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getProjectUuid() {
        return projectUuid;
    }

    public void setProjectUuid(String projectUuid) {
        this.projectUuid = projectUuid;
    }
}
