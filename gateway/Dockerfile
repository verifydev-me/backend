FROM nginx:alpine

# Install required modules
RUN apk add --no-cache curl

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create directories
RUN mkdir -p /var/log/nginx /etc/nginx/ssl /var/www/certbot

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
