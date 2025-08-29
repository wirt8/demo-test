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
![Demo](/demo/demo.mp4)

BE Logs info when place trade success
![BE Logs info when place trade success](/demo/log-success.png)

## Notes & Assumptions
### 🖥 Backend (FastAPI)
- Runs on **port 8000**  
- **CORS** enabled for `http://localhost:3000` 
- `GET /markets` → returns data from `backend/app/mock-data.json`  
- `POST /orders/place` → places order via Hyperliquid Testnet (no DB persistence)  
  - No persistence  
  - Leverage **capped at 3x**  
  - Trades **blocked within 24h of expiry**  
- Hyperliquid SDK usage (Testnet)
  - Place order: `POST /orders/place` uses `Exchange.order(...)` to submit a testnet order. On success, response includes `order_id` from HL (`oid`).
  - Query order by ID: `POST /orders/status` uses `Info.query_order_by_oid(account_address, oid)` to fetch order status.
  - Cancel order: `POST /orders/cancel` uses `Exchange.cancel("ETH", oid)` to cancel an existing order.
  - Environment variables required: `PRIVATE_KEY`, `ACCOUNT_ADDRESS`. Both MUST belong to a Hyperliquid Testnet wallet. SDK initialized against `constants.TESTNET_API_URL`. Place `.env` in `backend/app/` when running `uvicorn` from that directory.

---

### 💻 Frontend (Next.js)
- Runs on **port 3000**  
- Fetches markets from: `http://localhost:8000/markets` (via **react-query**)  
- Chart candidate histories (`p` values as **percentages**)  
- Show **expiry countdown**  
- Submit simple trades  
  - UI allows **1–5x leverage**  
  - Backend enforces **max 3x**  
- Trade History UI
  - Displays recent trades in a table (time, order ID, side, status, size, leverage, notional, mark).
  - Stored in browser `localStorage` per market for persistence across refreshes.
  - Actions: Refresh status and Cancel for resting/open orders.
- Client trading functions (see `frontend/app/page.tsx`)
  - Place order: `fetch(POST /orders/place)` on submit.
  - Query order: `fetch(POST /orders/status)` from Trade History → Refresh.
  - Cancel order: `fetch(POST /orders/cancel)` from Trade History → Cancel.
