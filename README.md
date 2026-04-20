# Academic Work Checker

Full-stack app with:
- `frontend` (Vite + React)
- `backend` (Express + MongoDB)
- `api/index.ts` (serverless entry for deployment rewrites)

## 1) Prerequisites

- Node.js 20+ (recommended)
- npm 10+
- MongoDB Atlas connection string

## 2) Environment Variables

Copy these templates:

- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env` (optional, only for Gemini features)

`backend/.env`:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

`frontend/.env` (optional):

```env
VITE_GEMINI_API_KEY=your_key
```

## 3) Install Dependencies

From project root:

```bash
npm run install:all
```

## 4) Run Locally

Start both backend and frontend:

```bash
npm run dev
```

Or run separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Frontend: `http://localhost:5173`  
Backend health: `http://localhost:3000/api/health`

## 5) Pre-Deploy Checks (must pass)

```bash
npm run verify
```

## 6) Build Scripts (root)

- `npm run build` -> production frontend build
- `npm run lint` -> frontend + backend type checks
- `npm run verify` -> full pre-deploy check (`lint` + `build`)

## 7) Deploy (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Keep project root as repository root.
4. Set environment variable in Vercel:
   - `MONGODB_URI` (required)
   - `VITE_GEMINI_API_KEY` (optional)
5. Deploy.

`vercel.json` is already configured to:
- run `npm run build`
- serve frontend from `frontend/dist`
- rewrite `/api/*` to `api/index.ts`

## 8) Security

- Never commit real secrets to Git.
- Rotate credentials immediately if they were exposed.

