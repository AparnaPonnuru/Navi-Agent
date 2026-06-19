# Naavi Frontend

React + Vite frontend for the Naavi Path Engine.

## Local Development

Start the backend from `../code`:

```bash
uvicorn main:app --reload --port 8001
```

Start the frontend from this folder:

```bash
npm install
npm run dev
```

Open `http://localhost:5173/dashboard`.

The frontend URL is only the browser app. Login and dashboard API calls go to `VITE_API_URL`, which defaults in code to `http://127.0.0.1:8001`.

To use a different backend port, create `.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Restart `npm run dev` after changing any Vite environment variable.
