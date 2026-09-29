# Single Railway service: API + production frontend at `/`.
FROM node:20-alpine AS web

WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .

ENV VITE_API_URL=/api
ENV VITE_WS_URL=/ws
ENV VITE_USE_MOCKS=false

RUN npm run build

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=web /web/dist /srv/static

RUN chmod +x /srv/scripts/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/srv/scripts/entrypoint.sh"]
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
