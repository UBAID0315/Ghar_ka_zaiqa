# Backend-only image — React frontend is deployed separately on Vercel
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Expose port
EXPOSE 8080

# Start FastAPI with uvicorn
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}
