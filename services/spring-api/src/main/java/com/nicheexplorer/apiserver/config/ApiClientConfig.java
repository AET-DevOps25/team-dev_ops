package com.nicheexplorer.apiserver.config;

import com.nicheexplorer.generated.api.AiApi;
import com.nicheexplorer.generated.api.ArticlesApi;
import com.nicheexplorer.generated.api.TopicsApi;
import com.nicheexplorer.generated.invoker.ApiClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import reactor.core.publisher.Mono;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class ApiClientConfig {

    private final ExchangeStrategies bigBuffer =
            ExchangeStrategies.builder()
                              .codecs(c -> c.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                              .build();

    @Bean
    public ApiClient genaiApiClient(
            @Value("${genai.base-url:http://genai:8000}") String baseUrl) {

        return new ApiClient(
                WebClient.builder()
                         .baseUrl(baseUrl)        
                         .exchangeStrategies(bigBuffer)   
                         .build()
        ).setBasePath("");                         
    }

    @Bean
    public ApiClient fetcherApiClient(
            @Value("${fetcher.base-url:http://article-fetcher:8200}") String baseUrl) {

        return new ApiClient(
                WebClient.builder()
                         .baseUrl(baseUrl)
                         .exchangeStrategies(bigBuffer)
                         .build()
        ).setBasePath("");
    }

    @Bean
    public ApiClient topicsApiClient(
            @Value("${topic.base-url:http://topic-discovery:8100}") String baseUrl) {

        return new ApiClient(
                WebClient.builder()
                         .baseUrl(baseUrl)
                         .exchangeStrategies(bigBuffer)
                         .build()
        ).setBasePath("");
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