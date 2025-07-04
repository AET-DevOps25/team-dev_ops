# Build stage: Responsible for building the frontend assets
FROM node:20 AS build

WORKDIR /app

# Copy package files and install dependencies
COPY web-client/package*.json ./

# Clean up npm before install
RUN rm -rf node_modules package-lock.json

RUN npm install

# Copy the entire web-client directory.
# This assumes the API client has already been generated locally
# and exists in `web-client/src/generated/api`.
COPY web-client ./web-client

# Set the working directory and run the standard build command.
WORKDIR /app/web-client
RUN rm -rf dist && npm run build

# Production stage: Responsible for serving the built assets
FROM nginx:alpine

# Copy built assets from the previous build stage
COPY --from=build /app/web-client/dist /usr/share/nginx/html

# Copy the Nginx configuration file
COPY --from=build /app/web-client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the web server
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
