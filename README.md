## Quick Start
1. Clone repository
2. Setup backend: `cd backend && pip install -r requirements.txt`
3. Setup frontend: `cd frontend && npm install`
4. Run backend: `uvicorn main:app --reload --port 8000`
5. Run frontend: `npm run dev`

## Architecture
- **Frontend**: React TypeScript with Tailwind CSS
- **Backend**: FastAPI with Hyperliquid SDK

## Demo
![UI](/demo/ui.png)
![Place Trade success](/demo/trade_success.png)
![Place Trade fail](/demo/trade_fail.png)
![BE Logs info when place trade success](/demo/be_logs_success.png)
![BE Logs info when place trade fail](/demo/be_logs_fail.png)

## Notes / Assumptions
- **Backend**: FastAPI with CORS for http://localhost:3000. Endpoints: `GET /`, `GET /markets` (reads `backend/app/mock-data.json`), `POST /orders/place` (mock, no persistence; leverage ≤ 3x; trades blocked within 24h of expiry).
- **Frontend**: Fetches `http://localhost:8000/markets` via react-query, charts candidate histories (`p` as %), shows expiry countdown, and submits simple trades (UI 1–5x; backend caps to 3x).
- **Mock Data**: `mock-data.json` contains `{ title, history: [{ t: epoch_sec, p: 0–1 }] }`.
- **Ports/CORS**: Backend 8000, Frontend 3000; CORS allowed for 3000 in `main.py`.
- **Paths**: Backend reads `"mock-data.json"` relative to `backend/app/` working directory.
