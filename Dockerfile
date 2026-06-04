# Stage 1: Build the frontend React app
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve using FastAPI
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY code/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY code/ /app/code/

# Copy built frontend dist folder to the expected relative path
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

# Expose port 7860 for Hugging Face
EXPOSE 7860

WORKDIR /app/code
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
