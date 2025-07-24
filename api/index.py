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
import random

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
# These are common Indian stocks. Made this list even more robust.
FALLBACK_NSE_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "LT",
    "HINDUNILVR", "ITC", "BAJFINANCE", "ASIANPAINT", "MARUTI", "KOTAKBANK",
    "AXISBANK", "SUNPHARMA", "NTPC", "POWERGRID", "TITAN", "ULTRACEMCO",
    "WIPRO", "HCLTECH", "TECHM", "NESTLEIND", "ONGC", "BPCL", "IOC"
]

# Get the absolute path to the public directory
BASE_DIR = Path(__file__).resolve().parent.parent # Points to the 'Stocker' root directory
PUBLIC_DIR = BASE_DIR / "public"

# Verify public directory existence during startup for debugging
if not PUBLIC_DIR.is_dir():
    print(f"CRITICAL ERROR: Public directory not found at {PUBLIC_DIR}")
    # This error would prevent static files from being served, but the dropdown is an API issue.

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
        csv_data = io.StringIO(response.text)
        
        # Check if CSV data is empty or HTML (indicating an error page)
        if not response.text.strip() or "html" in response.text.lower():
            print("WARNING: NSE response was empty or contained HTML. Using fallback symbols.")
            symbols = FALLBACK_NSE_SYMBOLS
        else:
            df = pd.read_csv(csv_data)
            if 'SYMBOL' in df.columns:
                symbols = df['SYMBOL'].unique().tolist()
                symbols = sorted([s for s in symbols if isinstance(s, str) and s.strip() != '']) # Clean and sort
                print(f"INFO: Successfully fetched {len(symbols)} symbols from NSE.")
            else:
                print("WARNING: 'SYMBOL' column not found in NSE CSV. Using fallback symbols.")
                symbols = FALLBACK_NSE_SYMBOLS

        if not symbols: # If symbols is empty after fetching/cleaning
            print("WARNING: No symbols extracted from NSE. Using fallback symbols.")
            symbols = FALLBACK_NSE_SYMBOLS

    except requests.exceptions.RequestException as e:
        print(f"ERROR: Request to NSE failed: {e}. Using fallback symbols.")
        symbols = FALLBACK_NSE_SYMBOLS
    except pd.errors.EmptyDataError:
        print("ERROR: NSE CSV was empty or malformed. Using fallback symbols.")
        symbols = FALLBACK_NSE_SYMBOLS
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching/processing NSE symbols: {e}. Using fallback symbols.")
        symbols = FALLBACK_NSE_SYMBOLS
    
    finally:
        # Ensure symbols are always returned, even on error, using fallback
        if not symbols:
            print("CRITICAL: Fallback symbols are also empty or failed to load. This should not happen.")
            symbols = ["NSE_FALLBACK_A", "NSE_FALLBACK_B", "NSE_FALLBACK_C"] # Absolute last resort
        
        # Update cache with whatever symbols we ended up with (fresh or fallback)
        _nse_symbols_cache["symbols"] = symbols
        _nse_symbols_cache["timestamp"] = current_time
        
        print(f"DEBUG: Final symbols list to be returned: {symbols[:5]}... (first 5 of {len(symbols)})") # Print first few for debugging
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
    uvicorn.run(app, host="127.0.0.1", port=8000)