FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV VITE_API_URL=/api
ENV VITE_WS_URL=/ws
ENV VITE_USE_MOCKS=false

RUN npm run build

FROM nginx:alpine

RUN apk add --no-cache gettext

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
