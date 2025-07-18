package com.nicheexplorer.apiserver.config;

import com.nicheexplorer.generated.api.AiApi;
import com.nicheexplorer.generated.api.ArticlesApi;
import com.nicheexplorer.generated.api.TopicsApi;
import com.nicheexplorer.generated.invoker.ApiClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApiClientConfig {

    @Bean
    public ApiClient genaiApiClient(@Value("${genai.base-url:http://genai:8000}") String baseUrl) {
        ApiClient client = new ApiClient();
        client.setBasePath(baseUrl);
        return client;
    }

    @Bean
    public ApiClient fetcherApiClient(@Value("${fetcher.base-url:http://article-fetcher:8200}") String baseUrl) {
        ApiClient client = new ApiClient();
        client.setBasePath(baseUrl);
        return client;
    }

    @Bean
    public ApiClient topicsApiClient(@Value("${topic.base-url:http://topic-discovery:8100}") String baseUrl) {
        ApiClient client = new ApiClient();
        client.setBasePath(baseUrl);
        return client;
    }

    @Bean
    public AiApi aiApi(@Qualifier("genaiApiClient") ApiClient apiClient) {
        return new AiApi(apiClient);
    }

    @Bean
    public ArticlesApi articlesApi(@Qualifier("fetcherApiClient") ApiClient apiClient) {
        return new ArticlesApi(apiClient);
    }

    @Bean
    public TopicsApi topicsApi(@Qualifier("topicsApiClient") ApiClient apiClient) {
        return new TopicsApi(apiClient);
    }
} 