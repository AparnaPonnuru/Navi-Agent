---
title: Navi Agent
emoji: 🚀
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Navi-Agent

Naavi-Agent is an AI-driven career path generator and curation system built with a React (Vite) frontend and a FastAPI backend, utilizing a multi-agent auditing pipeline powered by Groq.

## Hugging Face Spaces Deployment

This repository is pre-configured for direct deployment as a **Docker Space** on Hugging Face.

### Required Space Secrets / Environment Variables
Ensure you configure the following **Secrets** in your Hugging Face Space settings:
*   `MONGODB_URI`: Your MongoDB connection string (e.g., MongoDB Atlas).
*   `GROQ_API_KEY`: Your Groq API key for Llama 3 models.

---

## Local Development

### 1. Backend Setup
1. Navigate to the `code/` directory.
2. Create a `.env` file with:
   ```env
   MONGODB_URI=your_mongodb_uri
   GROQ_API_KEY=your_groq_api_key
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8001
   ```
   Keep this on port `8001` unless you also update the frontend `VITE_API_URL`.

### 2. Frontend Setup
1. Navigate to the `frontend/` directory.
2. Optional: copy `.env.example` to `.env.local` if you want to override the API URL.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open the app at `http://localhost:5173/dashboard`. The frontend runs on `5173`, but it calls the FastAPI backend at `http://127.0.0.1:8001`.
5. Build the production package:
   ```bash
   npm run build
   ```
