## Quick Start
1. Clone repository
2. Setup backend: `cd backend && pip install -r requirements.txt`
3. Setup frontend: `cd frontend && npm install`
4. Run backend: `cd backend/app && uvicorn main:app --reload --port 8000`
5. Run frontend: `cd frontend && npm run dev`

## Architecture
- **Frontend**: Next.js with Tailwind CSS
- **Backend**: FastAPI with Hyperliquid SDK

## Demo
UI
![UI](/demo/ui.png)

Place Trade success
![Place Trade success](/demo/trade-success.png)

Place Trade fail
![Place Trade fail](/demo/trade-block.png)

BE Logs info when place trade success
![BE Logs info when place trade success](/demo/log-success.png)

## Notes / Assumptions
## 🖥 Backend (FastAPI)
- Runs on **port 8000**  
- **CORS** enabled for `http://localhost:3000` 
- `GET /markets` → returns data from `backend/app/mock-data.json`  
- `POST /orders/place` → mock order placement  
  - No persistence  
  - Leverage **capped at 3x**  
  - Trades **blocked within 24h of expiry**  

---

## 💻 Frontend (Next.js)
- Runs on **port 3000**  
- Fetches markets from: `http://localhost:8000/markets` (via **react-query**)  
- Chart candidate histories (`p` values as **percentages**)  
- Show **expiry countdown**  
- Submit simple trades  
  - UI allows **1–5x leverage**  
  - Backend enforces **max 3x**  
