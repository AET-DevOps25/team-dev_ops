package com.nicheexplorer.apiserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.nicheexplorer.apiserver.config.GenAiProperties;

@SpringBootApplication(
    exclude = {
        DataSourceAutoConfiguration.class,
        JpaRepositoriesAutoConfiguration.class
    }
)
@ComponentScan(basePackages = {"com.nicheexplorer.controller", "com.nicheexplorer.apiserver"})
@EnableConfigurationProperties(GenAiProperties.class)
public class ApiServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiServerApplication.class, args);
    }
} 