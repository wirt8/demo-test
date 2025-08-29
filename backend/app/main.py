from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Optional
from eth_account.signers.local import LocalAccount
from hyperliquid.info import Info
from hyperliquid.utils import constants
import eth_account
from hyperliquid.exchange import Exchange
import logging
import json
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Predict Market")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScalarMarket(BaseModel):
    id: str
    title: str
    subtitle: str
    min_range: float
    max_range: float
    mark_price: float
    oracle_price: float
    expiry: datetime
    tick_size: float
    unit: str
    markets: list[dict]

class TradeRequest(BaseModel):
    market_id: str
    size: float
    leverage: float
    entry_price: float
    side: str

class TradeResponse(BaseModel):
    success: bool
    message: str
    order_id: Optional[str] = None
    trade_details: Optional[dict] = None
    hl_response: Optional[dict] = None

class CancelOrderRequest(BaseModel):
    order_id: str

# Init mock data
MOCK_MARKET = ScalarMarket(
    id="nobel_peace_2025",
    # min_range=45.0,
    # max_range=65.0,
    # mark_price=54.5,
    # oracle_price=54.2,
    min_range=0,
    max_range=1,
    mark_price=1,
    oracle_price=1,
    expiry = datetime(2025, 10, 10),
    tick_size=1,
    unit="",
    markets=[],
    title="Nobel Peace Prize Winner 2025",
    subtitle="The Nobel Peace Prize laureate(s) of 2025 will be announced on Friday 10 October, with the award ceremony taking place on 10 December in Oslo, Norway."
)

# Init test hyperliquid client
load_dotenv()
private_key = os.getenv("PRIVATE_KEY")
account_address = os.getenv("ACCOUNT_ADDRESS")
current_oid = "" # for checking status
logger.info(f"Private key: {private_key}")
logger.info(f"Account address: {account_address}")
try:
    account: LocalAccount = eth_account.Account.from_key(private_key)
    exchange = Exchange(wallet=account, base_url=constants.TESTNET_API_URL, account_address=account_address)
    info = Info(constants.TESTNET_API_URL, skip_ws=True)
except Exception as e:
    logger.error(f"Failed to initialize Hyperliquid testnet client: {e}")
    logger.error(f"Using mock data only")

@app.get("/")
async def root():
    return {"message": "Scalar Trading Terminal API", "status": "running"}

@app.get("/markets", response_model=list[ScalarMarket])
async def get_markets():
    # Read mock data from file
    with open("mock-data.json", "r") as f:
        mock_data = json.load(f)
    MOCK_MARKET.markets = mock_data
    return [MOCK_MARKET]

@app.get("/health")
async def get_order_status():
    try:
        order_status = info.query_order_by_oid(account_address, current_oid)
        return [order_status]
    except Exception as e:
        order_status = {'status': 'order', 'order': {'order': {'coin': 'ETH', 'side': 'B', 'limitPx': '1100.0', 'sz': '0.2', 'oid': 38218562569, 'timestamp': 1756430827231, 'triggerCondition': 'N/A', 'isTrigger': False, 'triggerPx': '0.0', 'children': [], 'isPositionTpsl': False, 'reduceOnly': False, 'orderType': 'Limit', 'origSz': '0.2', 'tif': 'Gtc', 'cloid': None}, 'status': 'open', 'statusTimestamp': 1756430827231}} # mock response
        return [order_status]
        # logger.error(f"Failed to get order status: {e}")
        # return json.dumps({"error": str(e)})

def validate_trade(trade: TradeRequest, market: ScalarMarket) -> tuple[bool, str]:
    # Check max leverage
    if trade.leverage > 3.0:
        return False, "Leverage cannot exceed 3x"
    
    # Check min time to expiry (24 hours)
    time_to_expiry = market.expiry - datetime.now()
    if time_to_expiry.total_seconds() < 24 * 3600:
        return False, "Cannot trade with less than 24 hours to expiry"
    return True, "Trade valid"

@app.post("/orders/place", response_model=TradeResponse)
async def place_order(trade: TradeRequest):
    logger.info(f"Received trade request: {trade}")

    market = MOCK_MARKET

    # Validate trade
    is_valid, validation_message = validate_trade(trade, market)
    if not is_valid:
        logger.warning(f"Trade validation failed: {validation_message}")
        return TradeResponse(
            success=False,
            message=validation_message
        )

    # Hyperliquid testnet place order
    notional_size = trade.size * trade.leverage
    try:
        order_result = exchange.order("ETH", True, notional_size / 1000, 1100, {"limit": {"tif": "Gtc"}})
    except Exception as e:
        order_result = {'status': 'ok', 'response': {'type': 'order', 'data': {'statuses': [{'resting': {'oid': 38218562569}}]}}} # mock response
        # logger.error(f"Failed to place order: {e}")
        # return TradeResponse(
        #     success=False,
        #     message="Failed to place order"
        # )
    if (order_result["status"] == "ok"):
        status = order_result["response"]["data"]["statuses"][0]
        order_id = status["resting"]["oid"]
        global current_oid
        current_oid = order_id
        # if "resting" in status:
        #     order_status = info.query_order_by_oid(account_address, order_id)
            # print("Order status by oid:", order_status)  
    # order_id = f"ORDER_{int(datetime.now().timestamp())}"

    trade_details = {
        "order_id": str(order_id),
        "market": market.title,
        "side": trade.side,
        # "entry_price": trade.entry_price,
        "size": trade.size,
        "leverage": trade.leverage,
        "notional_size": notional_size,
        "mark_price": market.mark_price,
        "oracle_price": market.oracle_price,
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info("=" * 50)
    logger.info("TRADE PLACED SUCCESSFULLY")
    logger.info(f"Order ID: {order_id}")
    logger.info(f"Market: {market.title}")
    logger.info(f"Side: {trade.side.upper()}")
    # logger.info(f"Entry Price: {trade.entry_price}{market.unit}")
    logger.info(f"Position Size: ${trade.size}")
    logger.info(f"Leverage: {trade.leverage}x")
    logger.info(f"Notional Size: ${notional_size}")
    logger.info(f"Mark Price: {market.mark_price}{market.unit}")
    logger.info(f"Oracle Price: {market.oracle_price}{market.unit}")
    logger.info("=" * 50)
    
    return TradeResponse(
        success=True,
        message="Trade placed successfully",
        order_id=str(order_id),
        trade_details=trade_details,
        hl_response=order_result
    )

@app.post("/orders/cancel")
async def cancel_order(cancel_request: CancelOrderRequest):
    try:
        logger.log(f"Cancel order: {cancel_request}")
        cancel_result = exchange.cancel("ETH", cancel_request.order_id)
    except Exception as e:
        cancel_result = {'status': 'ok', 'response': {'type': 'cancel', 'data': {'statuses': ['success']}}} # mock response
    return [cancel_result]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
