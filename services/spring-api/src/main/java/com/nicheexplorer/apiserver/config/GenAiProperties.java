package com.nicheexplorer.apiserver.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "genai")
public class GenAiProperties {

    /**
     * Base URL of the GenAI FastAPI service. Can be overridden via
     * environment variable GENAI_BASE_URL or property genai.base-url.
     */
    private String baseUrl = "http://localhost:8000";

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }
}
