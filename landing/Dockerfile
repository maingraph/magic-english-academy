FROM node:22-alpine AS builder
WORKDIR /app
COPY landing/package.json landing/package-lock.json ./
RUN npm ci
COPY landing/ ./
ARG PLATFORM_URL
ARG CONTACT_URL
ARG LANDING_CANONICAL_URL
ARG PAYMENT_API_URL
ENV PLATFORM_URL=$PLATFORM_URL
ENV CONTACT_URL=$CONTACT_URL
ENV LANDING_CANONICAL_URL=$LANDING_CANONICAL_URL
ENV PAYMENT_API_URL=$PAYMENT_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY landing/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
