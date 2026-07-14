# ---- Stage 1: Build React Frontend ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app/gharkazaiqa
COPY gharkazaiqa/package*.json ./
RUN npm install --legacy-peer-deps

COPY gharkazaiqa/ ./
RUN npm run build


# ---- Stage 2: Python Backend + Frontend Static Files ----
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy React build from stage 1
COPY --from=frontend-builder /app/gharkazaiqa/build ./gharkazaiqa/build

# Expose port (Fly.io default PORT=8080)
EXPOSE 8080

# Use shell form so $PORT env variable is expanded
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}
