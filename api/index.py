# Stocker/api/index.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from pathlib import Path

import yfinance as yf
import pandas as pd
import requests
import io
import datetime
import re # For regex in fuzzy search
import random # For sentiment simulation

app = FastAPI()

# Configure CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # WARNING: In production, change "*" to your specific frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory cache for demonstration.
_nse_symbols_cache = {"symbols": [], "timestamp": None}
_stock_data_cache = {}
CACHE_TTL_SYMBOLS = 24 * 3600 # 24 hours in seconds
CACHE_TTL_STOCK_DATA = 3600 # 1 hour in seconds

# Get the absolute path to the 'public' directory
BASE_DIR = Path(__file__).resolve().parent.parent # Points to the 'Stocker' root directory
PUBLIC_DIR = BASE_DIR / "public"

# --- API Endpoints (These MUST come FIRST, before any generic static file serving) ---
# All API endpoints MUST be prefixed (e.g., '/api') to avoid conflict with static files.

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
        
        # Increased timeout as per user request
        response = requests.get(url, headers=headers, timeout=30) 
        response.raise_for_status()
        
        # Read with a more robust engine, and handle potential encoding issues
        df = pd.read_csv(io.StringIO(response.text), encoding='latin1') 
        symbols = df['SYMBOL'].unique().tolist()
        
        _nse_symbols_cache["symbols"] = symbols
        _nse_symbols_cache["timestamp"] = current_time
        
        return {"symbols": symbols}
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching symbols from NSE: {e}. Please check your internet connection or try again later.")
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=500, detail="NSE data is empty or malformed. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while fetching symbols: {e}")

@app.get("/api/search-symbols")
async def search_symbols_api(query: str = Query(..., min_length=1)):
    """
    Searches for stock symbols based on a query, providing recommendations.
    Uses cached symbols from get_symbols_api.
    """
    # Ensure symbols are loaded/cached
    await get_symbols_api() 
    all_symbols = _nse_symbols_cache["symbols"]
    
    search_query = query.upper()
    
    # Prioritize exact matches, then starts with, then contains
    matching_symbols = []
    
    # Exact match first
    for symbol in all_symbols:
        if symbol == search_query:
            matching_symbols.append(symbol)
    
    # Starts with
    for symbol in all_symbols:
        if symbol.startswith(search_query) and symbol not in matching_symbols:
            matching_symbols.append(symbol)
            
    # Contains (fuzzy match)
    for symbol in all_symbols:
        if search_query in symbol and symbol not in matching_symbols:
            matching_symbols.append(symbol)
            
    # Limit results for practicality
    return {"symbols": matching_symbols[:20]} # Limit to top 20 recommendations


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
        
        # Ensure 'date' column is correctly formatted as ISO string for JSON serialization
        hist['Date'] = hist.index.strftime('%Y-%m-%d %H:%M:%S')

        _stock_data_cache[cache_key] = {
            "history": hist,
            "info": info,
            "timestamp": current_time
        }

        # Convert to list of dictionaries for frontend
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

# --- Serve the static frontend (public directory) as the root of the web server ---
# This MUST be the LAST mount/route defined in the app.
# It will serve index.html for '/', and other files like 'style.css' and 'script.js' directly
# from the 'public' directory when requested by their relative paths.
app.mount(
    "/",  # Mount the public directory at the root of the application
    StaticFiles(directory=PUBLIC_DIR, html=True), # Use the absolute path, enable HTML fallback
    name="static_files" # Give it a name for internal FastAPI reference
)

# This part is for local development with Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)