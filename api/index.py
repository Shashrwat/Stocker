# Stocker/api/index.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # NEW
from starlette.responses import FileResponse # NEW
from pathlib import Path # NEW

import yfinance as yf
import pandas as pd
import requests
import io
import numpy as np
from scipy.stats import gaussian_kde
import random
import os
import datetime

app = FastAPI()

# Configure CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[""], # WARNING: In production, change "" to your specific frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory cache for demonstration.
_nse_symbols_cache = {"symbols": [], "timestamp": None}
_stock_data_cache = {} # key: (symbol, period) -> {"history": DataFrame, "info": Dict, "timestamp": datetime}
CACHE_TTL_SYMBOLS = 24 * 3600 # 24 hours in seconds
CACHE_TTL_STOCK_DATA = 3600 # 1 hour in seconds


# NEW: Mount the 'public' directory to serve static files
# Make sure the 'public' directory is copied to the root of your deployed app
app.mount("/static", StaticFiles(directory="public"), name="static")

# NEW: Serve the main index.html file at the root URL
@app.get("/")
async def serve_index():
    return FileResponse(Path("public/index.html"))

# Existing API routes from previous versions

@app.get("/api/symbols")
async def get_symbols_api():
    """Fetches unique stock symbols from NSE India with caching."""
    current_time = datetime.datetime.now()
    if _nse_symbols_cache["symbols"] and \
       (current_time - _nse_symbols_cache["timestamp"]).total_seconds() < CACHE_TTL_SYMBOLS:
        return {"symbols": _nse_symbols_cache["symbols"]}
    
    try:
        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        df = pd.read_csv(io.StringIO(response.text))
        symbols = df['SYMBOL'].unique().tolist()
        
        _nse_symbols_cache["symbols"] = symbols
        _nse_symbols_cache["timestamp"] = current_time
        
        return {"symbols": symbols}
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching symbols from NSE: {e}. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while fetching symbols: {e}")

@app.get("/api/stock/{symbol}")
async def get_stock_data_api(symbol: str, period: str = "1y"):
    """Fetches historical stock data and company information for a given symbol with caching."""
    cache_key = (symbol, period)
    current_time = datetime.datetime.now()

    if cache_key in _stock_data_cache and \
       (current_time - _stock_data_cache[cache_key]["timestamp"]).total_seconds() < CACHE_TTL_STOCK_DATA:
        cached_data = _stock_data_cache[cache_key]
        return {
            "history": cached_data["history"].reset_index().to_dict(orient='records'),
            "info": cached_data["info"]
        }

    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        hist = ticker.history(period=period)
        info = ticker.info

        if hist.empty:
            raise HTTPException(status_code=404, detail="No data found for the selected stock and period. It might be an invalid symbol or period.")
        
        _stock_data_cache[cache_key] = {
            "history": hist,
            "info": info,
            "timestamp": current_time
        }

        hist_records = hist.reset_index().rename(columns={'Date': 'date'}).to_dict(orient='records')
        
        return {"history": hist_records, "info": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stock data for {symbol}: {e}. Please check the symbol or try again later.")

@app.get("/api/sentiment")
async def get_sentiment_api():
    """Generates simulated AI market insights."""
    bullish = random.randint(40, 85)
    bearish = 100 - bullish
    forecast = round(random.uniform(-3.5, 5.5), 1)
    return {
        "bullish": bullish,
        "bearish": bearish,
        "forecast": forecast
    }

# This part is for local development with Uvicorn
if __name__ == "__main_":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)