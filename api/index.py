# Stocker/api/index.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from pathlib import Path
import os
import datetime
import yfinance as yf
import pandas as pd
import requests
import io
import numpy as np
import random # scipy.stats.gaussian_kde is not used in your current script.js, so I'm removing it from backend for minimalism.

# You might want to remove python-magic and python-magic-bin from requirements if not using directly for file type checks in FastAPI
# If you are serving user-uploaded content, they are useful. For serving pre-defined static files, StaticFiles handles basic MIME types.

app = FastAPI()

# Configure CORS
# IMPORTANT: In production, change "*" to your specific frontend URL(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development/testing on Render, "*" is fine. For production, restrict to your frontend domain(s).
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory cache
_nse_symbols_cache = {"symbols": [], "timestamp": None}
_stock_data_cache = {}
CACHE_TTL_SYMBOLS = 24 * 3600  # Cache symbols for 24 hours
CACHE_TTL_STOCK_DATA = 3600    # Cache stock data for 1 hour

# Fallback symbols in case NSE API fails.
# These are common Indian stocks.
FALLBACK_NSE_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL",
    "SBIN", "LT", "HINDUNILVR", "ITC", "BAJFINANCE", "ASIANPAINT"
]

# Get the absolute path to the public directory
BASE_DIR = Path(__file__).resolve().parent.parent # Points to the 'Stocker' root directory
PUBLIC_DIR = BASE_DIR / "public"

# Verify public directory existence during startup
if not PUBLIC_DIR.is_dir():
    print(f"CRITICAL ERROR: Public directory not found at {PUBLIC_DIR}")
    # You might want to raise an exception or handle this more gracefully in production
    # but for now, just print to ensure it's noticed in logs.

# Mount the public directory to serve static files
app.mount(
    "/",
    StaticFiles(directory=PUBLIC_DIR, html=True),
    name="static_files"
)

# --- API Endpoints ---

@app.get("/api/symbols")
async def get_symbols_api():
    """Fetches unique stock symbols from NSE India with caching and a fallback."""
    current_time = datetime.datetime.now()
    
    # Check cache first
    if _nse_symbols_cache["symbols"] and \
       (current_time - _nse_symbols_cache["timestamp"]).total_seconds() < CACHE_TTL_SYMBOLS:
        print("INFO: Serving symbols from cache.")
        return {"symbols": _nse_symbols_cache["symbols"]}
    
    print("INFO: Attempting to fetch fresh symbols from NSE...")
    symbols = []
    try:
        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
        
        response = requests.get(url, headers=headers, timeout=15) # Increased timeout
        response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
        
        # Try to read CSV, handle potential parsing errors
        df = pd.read_csv(io.StringIO(response.text))
        if 'SYMBOL' in df.columns:
            symbols = df['SYMBOL'].unique().tolist()
            symbols = sorted([s for s in symbols if isinstance(s, str) and s.strip() != '']) # Clean and sort
            print(f"INFO: Successfully fetched {len(symbols)} symbols from NSE.")
        else:
            print("WARNING: 'SYMBOL' column not found in NSE CSV. Using fallback symbols.")
            symbols = FALLBACK_NSE_SYMBOLS

        if not symbols: # If symbols is empty after fetching/cleaning
            print("WARNING: No symbols found from NSE. Using fallback symbols.")
            symbols = FALLBACK_NSE_SYMBOLS

        _nse_symbols_cache["symbols"] = symbols
        _nse_symbols_cache["timestamp"] = current_time
        
        return {"symbols": symbols}
    
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Request to NSE failed: {e}. Using fallback symbols.")
        symbols = FALLBACK_NSE_SYMBOLS
    except pd.errors.EmptyDataError:
        print("ERROR: NSE CSV was empty. Using fallback symbols.")
        symbols = FALLBACK_NSE_SYMBOLS
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching/processing NSE symbols: {e}. Using fallback symbols.")
        symbols = FALLBACK_NSE_SYMBOLS
    
    finally:
        # Ensure symbols are always returned, even on error, using fallback
        if not symbols:
            print("CRITICAL: Fallback symbols are also empty, this should not happen.")
            symbols = [] # Should ideally never be empty if FALLBACK_NSE_SYMBOLS is populated
        
        # Update cache with whatever symbols we ended up with (fresh or fallback)
        _nse_symbols_cache["symbols"] = symbols
        _nse_symbols_cache["timestamp"] = current_time
        return {"symbols": symbols}


@app.get("/api/stock/{symbol}")
async def get_stock_data_api(symbol: str, period: str = "1y"):
    """Fetches historical stock data and company information for a given symbol with caching."""
    cache_key = (symbol, period)
    current_time = datetime.datetime.now()

    # Check cache first
    if cache_key in _stock_data_cache and \
       (current_time - _stock_data_cache[cache_key]["timestamp"]).total_seconds() < CACHE_TTL_STOCK_DATA:
        print(f"INFO: Serving stock data for {symbol} from cache.")
        cached_data = _stock_data_cache[cache_key]
        return {
            "history": cached_data["history"].reset_index().to_dict(orient='records'),
            "info": cached_data["info"]
        }

    print(f"INFO: Attempting to fetch fresh stock data for {symbol}.NS (period: {period})...")
    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        hist = ticker.history(period=period)
        
        # Fetch info only if hist data is available and not empty, to save calls.
        # Yahoo Finance info can be slow or fail independently.
        info = {}
        try:
            info = ticker.info
            print(f"INFO: Successfully fetched info for {symbol}.NS.")
        except Exception as info_e:
            print(f"WARNING: Could not fetch info for {symbol}.NS: {info_e}. Continuing without info.")

        if hist.empty:
            print(f"WARNING: No historical data found for {symbol}.NS for period {period}. Returning 404.")
            raise HTTPException(status_code=404, detail="No data found for the selected stock and period. It might be an invalid symbol or period.")
        
        _stock_data_cache[cache_key] = {
            "history": hist,
            "info": info,
            "timestamp": current_time
        }
        print(f"INFO: Successfully fetched historical data for {symbol}.NS (rows: {len(hist)}).")

        hist_records = hist.reset_index().rename(columns={'Date': 'date'}).to_dict(orient='records')
        
        return {"history": hist_records, "info": info}
    except HTTPException: # Re-raise explicit HTTPExceptions
        raise
    except Exception as e:
        print(f"ERROR: An error occurred while fetching stock data for {symbol}.NS: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching stock data for {symbol}: {e}. Please check the symbol or try again later.")

@app.get("/api/sentiment")
async def get_sentiment_api():
    """Generates simulated AI market insights."""
    print("INFO: Generating simulated AI sentiment.")
    bullish = random.randint(40, 85)
    bearish = 100 - bullish
    forecast = round(random.uniform(-3.5, 5.5), 1)
    return {
        "bullish": bullish,
        "bearish": bearish,
        "forecast": forecast
    }

if __name__ == "__main__":
    import uvicorn
    # Make sure to install python-dotenv if you use .env files locally
    # from dotenv import load_dotenv
    # load_dotenv() # Load environment variables from .env file (if present)
    
    # For local development, use 127.0.0.1 (localhost)
    uvicorn.run(app, host="127.0.0.1", port=8000)