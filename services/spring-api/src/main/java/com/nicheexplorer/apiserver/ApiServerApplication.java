package com.nicheexplorer.apiserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.nicheexplorer.apiserver.config.GenAiProperties;

@SpringBootApplication
@EnableConfigurationProperties(GenAiProperties.class)
public class ApiServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiServerApplication.class, args);
    }
}
