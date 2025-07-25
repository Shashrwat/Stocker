// Stocker/public/script.js

// Determine the API base URL. On Render, it will be the same origin as your frontend.
const API_BASE_URL = window.location.origin;

// DOM Elements
const stockSearchInput = document.getElementById('stock-search-input');
const stockSuggestionsDatalist = document.getElementById('stock-suggestions');
const periodSelect = document.getElementById('period-select');
const chartSelect = document.getElementById('chart-select');
const indicatorSelect = document.getElementById('indicator-select');
const loadingIndicator = document.getElementById('loading-indicator');
const messageBox = document.getElementById('message-box');
const metricsContainer = document.getElementById('metrics-container');
const mainChartDiv = document.getElementById('main-chart');
const overviewSection = document.getElementById('overview-section');
const secondaryMetricsContainer = document.getElementById('secondary-metrics-container');
const volumeChartDiv = document.getElementById('volume-chart');
const ownershipChartDiv = document.getElementById('ownership-chart');
const returnsChartDiv = document.getElementById('returns-chart');
const aiInsightsSection = document.getElementById('ai-insights-section');
const newsSection = document.getElementById('news-section');
const newsList = document.getElementById('news-list');

// Global debounce timer for search input
let searchTimeout = null;
const SEARCH_DEBOUNCE_TIME = 300; // milliseconds

console.log("script.js: Starting script execution.");

document.addEventListener('DOMContentLoaded', async () => {
    console.log("script.js: DOMContentLoaded event fired. Starting initial async operations.");

    // Render dot grid background
    renderDotGrid();
    // Initialize minimal tsParticles
    await loadMinimalParticles();
    // Animate section entrances
    animateSectionsOnScroll();

    console.log("script.js: Setting up event listeners.");
    
    // Event listener for stock search input (for recommendations)
    stockSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = stockSearchInput.value.trim();
            if (query.length >= 1) { // Trigger search for at least 1 character
                searchAndSuggestSymbols(query);
            } else {
                stockSuggestionsDatalist.innerHTML = ''; // Clear suggestions if input is empty
            }
        }, SEARCH_DEBOUNCE_TIME);
    });

    // Event listener for when a suggestion is selected OR user types and presses Enter/leaves field
    stockSearchInput.addEventListener('change', async () => {
        const selectedSymbol = stockSearchInput.value.trim().toUpperCase(); // Ensure uppercase for consistency
        if (selectedSymbol) {
            console.log(`script.js: Stock input changed to ${selectedSymbol}. Calling loadStockDataAndCharts()...`);
            await loadStockDataAndCharts(selectedSymbol);
            console.log("script.js: Stock selection changed. Calling loadNews()...");
            await loadNews(selectedSymbol); // Reload news when stock changes
        }
    });

    periodSelect.addEventListener('change', () => {
        const symbol = stockSearchInput.value.trim();
        if (symbol) {
            console.log("script.js: Period changed. Calling loadStockDataAndCharts()...");
            loadStockDataAndCharts(symbol);
        }
    });
    chartSelect.addEventListener('change', () => {
        const symbol = stockSearchInput.value.trim();
        if (symbol) {
            console.log("script.js: Chart style changed. Calling loadStockDataAndCharts()...");
            loadStockDataAndCharts(symbol);
        }
    });
    indicatorSelect.addEventListener('change', () => {
        const symbol = stockSearchInput.value.trim();
        if (symbol) {
            console.log("script.js: Indicator changed. Calling loadStockDataAndCharts()...");
            loadStockDataAndCharts(symbol);
        }
    });

    // Initial load of data for a default stock
    try {
        // Pre-populate datalist with some common symbols (if not dynamically loading on initial start)
        // For a smoother initial load, you could fetch all symbols and store them client-side if the list isn't too large
        // For now, let's rely on searchAndSuggestSymbols to populate the datalist for the first time
        await searchAndSuggestSymbols("RELI"); // Load some initial suggestions, e.g., for "RELI"
        const defaultSymbol = "RELIANCE"; // Default stock
        stockSearchInput.value = defaultSymbol; // Set the default in the input
        await loadStockDataAndCharts(defaultSymbol);
        await loadAISentiment();
        await loadNews(defaultSymbol);
    } catch (error) {
        console.error("script.js: Initialization chain failed:", error);
        showMessage("Failed to load initial data. Please try again or search for a stock.", "error");
    }
    
    console.log("script.js: DOMContentLoaded block finished.");
});

/**
 * Renders a subtle grid of evenly spaced small dots on a canvas.
 */
function renderDotGrid() {
    const gridDiv = document.getElementById('dot-grid-bg');
    if (!gridDiv) return;
    let canvas = gridDiv.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        gridDiv.appendChild(canvas);
    }
    function resizeAndDraw() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        const spacing = 36;
        const dotRadius = 1.2;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#e0e0e0';
        for (let y = spacing/2; y < window.innerHeight; y += spacing) {
            for (let x = spacing/2; x < window.innerWidth; x += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        ctx.restore();
    }
    window.addEventListener('resize', resizeAndDraw);
    resizeAndDraw();
}

/**
 * Loads tsParticles with a minimal, softly animated white/gray particles config.
 */
async function loadMinimalParticles() {
    await tsParticles.load({
        id: "tsparticles",
        options: {
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            particles: {
                number: { value: 60, density: { enable: true, area: 900 } },
                color: { value: ["#fff", "#e0e0e0"] },
                shape: { type: "circle" },
                opacity: { value: 0.5, random: { enable: true, minimumValue: 0.3 } },
                size: { value: 2.5, random: { enable: true, minimumValue: 1.2 } },
                move: {
                    enable: true,
                    speed: 0.3,
                    direction: "none",
                    random: true,
                    straight: false,
                    outModes: { default: "out" },
                    attract: { enable: false }
                },
                links: {
                    enable: true,
                    distance: 110,
                    color: "#fff",
                    opacity: 0.13,
                    width: 1.1
                }
            },
            interactivity: {
                events: {
                    onHover: { enable: true, mode: ["grab", "connect"] },
                    resize: true
                },
                modes: {
                    grab: {
                        distance: 140,
                        links: { opacity: 0.25 }
                    },
                    connect: { distance: 120, radius: 80, links: { opacity: 0.18 } }
                }
            },
            detectRetina: true,
            fullScreen: { enable: true, zIndex: 1 }
        }
    });
}

/**
 * Displays a temporary message to the user.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type} show`;
    setTimeout(() => {
        messageBox.className = 'message-box'; // Hide after a delay
    }, 5000);
}

/**
 * Shows or hides the loading spinner.
 * @param {boolean} show - True to show, false to hide.
 */
function toggleLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

/**
 * Fetches stock symbols based on a query and populates the datalist for recommendations.
 * @param {string} query - The search query for symbols.
 */
async function searchAndSuggestSymbols(query) {
    console.log(`searchAndSuggestSymbols(): Searching for "${query}"`);
    try {
        const url = `${API_BASE_URL}/api/search-symbols?query=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown API error during symbol search" }));
            throw new Error(errorData.detail || `Failed to fetch symbol suggestions: HTTP status ${response.status}`);
        }
        const data = await response.json();
        console.log("searchAndSuggestSymbols(): API data received:", data);

        stockSuggestionsDatalist.innerHTML = '';
        if (data.symbols && Array.isArray(data.symbols) && data.symbols.length > 0) {
            data.symbols.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol;
                stockSuggestionsDatalist.appendChild(option);
            });
            // Auto-select the first suggestion if the input exactly matches one
            if (data.symbols.includes(query.toUpperCase())) {
                stockSearchInput.value = query.toUpperCase();
            }
        } else {
            // Optionally, clear the input or show a "no suggestions" message if desired
            // stockSuggestionsDatalist.innerHTML = '<option value="No suggestions found."></option>';
        }
    } catch (error) {
        console.error("searchAndSuggestSymbols(): Error:", error);
        // showMessage(`Error searching symbols: ${error.message}`, "error"); // Don't show error for every search typing
        stockSuggestionsDatalist.innerHTML = '';
    }
}


/**
 * Fetches historical stock data and renders all charts and metrics.
 * @param {string} symbol - The stock symbol to fetch data for.
 */
async function loadStockDataAndCharts(symbol) {
    console.log("loadStockDataAndCharts(): Function started.");
    const period = periodSelect.value;
    const chartType = chartSelect.value;
    const indicator = indicatorSelect.value;

    if (!symbol) {
        console.log("loadStockDataAndCharts(): No symbol selected, skipping data load.");
        showMessage("Please select or search for a stock symbol.", "error");
        return;
    }

    toggleLoading(true);
    showMessage("", ""); // Clear any previous messages

    try {
        console.log(`loadStockDataAndCharts(): Fetching from ${API_BASE_URL}/api/stock/${symbol}?period=${period}`);
        const response = await fetch(`${API_BASE_URL}/api/stock/${symbol}?period=${period}`);
        console.log("loadStockDataAndCharts(): Fetch response received.", response);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown API error" }));
            console.error("loadStockDataAndCharts(): API response not OK.", errorData);
            throw new Error(errorData.detail || `Failed to fetch stock data: HTTP status ${response.status}`);
        }
        const data = await response.json();
        console.log("loadStockDataAndCharts(): API data received:", data);

        const hist = data.history; // Array of objects
        const info = data.info;    // Object

        if (!hist || hist.length === 0) {
            console.warn("loadStockDataAndCharts(): No historical data found.", data);
            showMessage("No data available for selected stock and period. Try a different period.", "error");
            // Clear all displayed content if no data
            Plotly.purge(mainChartDiv);
            Plotly.purge(volumeChartDiv);
            Plotly.purge(returnsChartDiv);
            metricsContainer.innerHTML = '';
            secondaryMetricsContainer.innerHTML = '';
            overviewSection.style.display = 'none';
            return;
        }

        // Convert date strings to Date objects for Plotly.js
        hist.forEach(d => {
            d.date = new Date(d.date);
        });
        
        // Render all sections
        console.log("loadStockDataAndCharts(): Rendering charts and metrics...");
        renderMainChart(hist, symbol, chartType, indicator);
        renderVolumeBars(hist);
        renderAnalyticsPie(); // Static data, can be made dynamic if data is available
        renderReturnsWave(hist);
        updateInfoMetrics(hist, info);
        showMessage("Stock data loaded successfully!", "success");
        console.log("loadStockDataAndCharts(): All rendering complete.");

    } catch (error) {
        console.error("loadStockDataAndCharts(): Critical error:", error);
        showMessage(`Error loading stock data: ${error.message}`, "error");
        // Clear all displayed content on error
        Plotly.purge(mainChartDiv);
        Plotly.purge(volumeChartDiv);
        Plotly.purge(returnsChartDiv);
        metricsContainer.innerHTML = '';
        secondaryMetricsContainer.innerHTML = '';
        overviewSection.style.display = 'none';
    } finally {
        toggleLoading(false);
        console.log("loadStockDataAndCharts(): Function finished.");
    }
}

/**
 * Calculates Simple Moving Average (SMA).
 * @param {Array<number>} data - Array of closing prices.
 * @param {number} windowSize - The period for the SMA.
 * @returns {Array<number|null>} Array of SMA values, with nulls for initial period.
 */
function calculateSMA(data, windowSize) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < windowSize - 1) {
            sma.push(null);
        } else {
            const sum = data.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / windowSize);
        }
    }
    return sma;
}

/**
 * Renders the main stock chart (Candlestick, Line, or Area) with optional indicators.
 * @param {Array<Object>} hist - Historical data.
 * @param {string} symbol - Stock symbol.
 * @param {string} chartType - Type of chart (Candlestick, Line, Area).
 * @param {string} indicator - Indicator to add (e.g., 'SMA50', 'SMA200').
 */
function renderMainChart(hist, symbol, chartType, indicator) {
    let traces = [];
    
    // Main price trace
    if (chartType === "Candlestick") {
        traces.push({
            x: hist.map(d => d.date),
            open: hist.map(d => d.Open),
            high: hist.map(d => d.High),
            low: hist.map(d => d.Low),
            close: hist.map(d => d.Close),
            type: 'candlestick',
            name: 'Price',
            increasing: { line: { color: 'var(--color-positive)' } }, // Green for increasing
            decreasing: { line: { color: 'var(--color-negative)' } } // Red for decreasing
        });
    } else {
        traces.push({
            x: hist.map(d => d.date),
            y: hist.map(d => d.Close),
            mode: 'lines',
            line: { color: 'var(--color-primary)', width: 2 },
            fill: chartType === "Area" ? 'toself' : 'none',
            type: 'scatter',
            name: 'Close Price'
        });
    }

    // Add indicator trace if selected
    if (indicator !== "None") {
        const closePrices = hist.map(d => d.Close);
        let smaValues;
        let smaPeriod;
        let smaColor;

        if (indicator === "SMA50") {
            smaPeriod = 50;
            smaValues = calculateSMA(closePrices, smaPeriod);
            smaColor = '#FFD700'; // Gold
        } else if (indicator === "SMA200") {
            smaPeriod = 200;
            smaValues = calculateSMA(closePrices, smaPeriod);
            smaColor = '#90EE90'; // Light Green
        }

        if (smaValues) {
            traces.push({
                x: hist.map(d => d.date),
                y: smaValues,
                mode: 'lines',
                line: { color: smaColor, width: 1.5, dash: 'dot' },
                name: `${indicator}`
            });
        }
    }

    const layout = {
        title: {
            text: `<b>${symbol} Price Trend</b>`,
            font: { size: 24, color: 'var(--color-primary)', family: 'Space Grotesk, sans-serif' }
        },
        height: 500,
        xaxis: { 
            rangeslider: { visible: false }, 
            showgrid: false, 
            zeroline: false,
            tickfont: { color: 'var(--text-color-medium)' },
            type: 'date',
            title: { text: 'Date', font: { color: 'var(--text-color-light)' } }
        },
        yaxis: { 
            showgrid: false, 
            zeroline: false,
            tickfont: { color: 'var(--text-color-medium)' },
            title: { text: 'Price (INR)', font: { color: 'var(--text-color-light)' } }
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)', // Ensure chart background is transparent
        font: { color: 'var(--text-color-light)', family: 'Space Grotesk, sans-serif' },
        margin: { t: 60, b: 60, l: 60, r: 60 },
        hovermode: 'x unified',
        legend: {
            x: 0, y: 1.1,
            bgcolor: 'rgba(0,0,0,0)',
            bordercolor: 'rgba(0,0,0,0)',
            font: { color: 'var(--text-color-light)' }
        }
    };

    Plotly.newPlot(mainChartDiv, traces, layout);
}

/**
 * Renders the volume bar chart.
 * @param {Array<Object>} hist - Historical data.
*/
function renderVolumeBars(hist) {
    const trace = {
        x: hist.map(d => d.date),
        y: hist.map(d => d.Volume),
        type: 'bar',
        marker: {
            color: hist.map(d => {
                const close = d.Close;
                const open = d.Open;
                // Color based on price change: green for increase, red for decrease
                return close >= open ? 'var(--color-positive)' : 'var(--color-negative)';
            }), 
            line: { width: 0 }
        }
    };
    const layout = {
        title: {
            text: '<b>Daily Trading Volume</b>',
            font: { size: 20, color: 'var(--color-primary)', family: 'Space Grotesk, sans-serif' }
        },
        height: 300,
        xaxis: { showgrid: false, zeroline: false, tickfont: { color: 'var(--text-color-medium)' }, type: 'date', title: { text: 'Date', font: { color: 'var(--text-color-light)' } } },
        yaxis: { showgrid: false, zeroline: false, tickfont: { color: 'var(--text-color-medium)' }, title: { text: 'Volume', font: { color: 'var(--text-color-light)' } } },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)', // Ensure chart background is transparent
        font: { color: 'var(--text-color-light)', family: 'Space Grotesk, sans-serif' },
        margin: { t: 60, b: 60, l: 60, r: 60 }
    };
    Plotly.newPlot(volumeChartDiv, [trace], layout);
}

/**
 * Renders the ownership structure pie chart (static data).
 */
function renderAnalyticsPie() {
    const trace = {
        labels: ['Institutional Investors', 'Retail Investors', 'Company Insiders', 'Mutual Funds'],
        values: [40, 30, 15, 15], // Adjusted values for more variety
        hole: 0.5,
        type: 'pie',
        marker: {
            colors: ['var(--color-primary)', 'var(--color-accent)', 'var(--color-secondary)', '#8a2be2'], // Added another color
            line: { color: 'var(--color-dark-bg)', width: 2 } // Darker line for contrast
        },
        textinfo: 'percent+label',
        hoverinfo: 'label+percent+value',
        textfont: {
            color: 'var(--text-color-light)' // Text on pie slices
        }
    };
    const layout = {
        title: {
            text: '<b>Ownership Distribution</b>',
            font: { size: 20, color: 'var(--color-primary)', family: 'Space Grotesk, sans-serif' }
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)', // Ensure chart background is transparent
        font: { color: 'var(--text-color-light)', family: 'Space Grotesk, sans-serif' },
        margin: { t: 60, b: 60, l: 60, r: 60 },
        legend: {
            font: { color: 'var(--text-color-light)' }
        }
    };
    Plotly.newPlot(ownershipChartDiv, [trace], layout);
}

/**
 * Renders the returns distribution histogram.
 * @param {Array<Object>} hist - Historical data.
 */
function renderReturnsWave(hist) {
    const closePrices = hist.map(d => d.Close);
    if (closePrices.length < 2) {
        Plotly.purge(returnsChartDiv);
        return;
    }
    const returns = [];
    for (let i = 1; i < closePrices.length; i++) {
        returns.push((closePrices[i] - closePrices[i-1]) / closePrices[i-1]);
    }

    const traceHist = {
        x: returns,
        type: 'histogram',
        histnorm: 'probability density',
        marker: { color: 'var(--color-primary-transparent)', line: { color: 'var(--color-primary)', width: 1 } },
        name: 'Returns Histogram'
    };

    const layout = {
        title: {
            text: '<b>Daily Returns Distribution</b>',
            font: { size: 20, color: 'var(--color-primary)', family: 'Space Grotesk, sans-serif' }
        },
        xaxis: { title: 'Daily Returns', showgrid: false, zeroline: false, tickfont: { color: 'var(--text-color-medium)' } },
        yaxis: { title: 'Density', showgrid: false, zeroline: false, tickfont: { color: 'var(--text-color-medium)' } },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)', // Ensure chart background is transparent
        font: { color: 'var(--text-color-light)', family: 'Space Grotesk, sans-serif' },
        showlegend: false,
        margin: { t: 60, b: 60, l: 60, r: 60 }
    };
    Plotly.newPlot(returnsChartDiv, [traceHist], layout);
}

/**
 * Updates the top and secondary metric cards and the company overview.
 * @param {Array<Object>} hist - Historical data.
 * @param {Object} info - Company information.
 */
function updateInfoMetrics(hist, info) {
    // Top Metrics
    metricsContainer.innerHTML = ''; // Clear previous
    const lastClosePrice = hist[hist.length - 1].Close;
    const previousClosePrice = hist[hist.length - 2]?.Close; // Get previous day's close for change calculation
    
    let priceChange = 'N/A';
    let changeClass = '';
    if (lastClosePrice && previousClosePrice) {
        const change = lastClosePrice - previousClosePrice;
        const percentChange = (change / previousClosePrice) * 100;
        priceChange = `${change.toFixed(2)} (${percentChange.toFixed(2)}%)`;
        changeClass = change >= 0 ? 'positive-change' : 'negative-change';
    }

    const topMetrics = {
        'Current Price': lastClosePrice,
        'Daily Change': priceChange, // New metric
        '52W High': info.fiftyTwoWeekHigh,
        'P/E Ratio': info.trailingPE,
        'Market Cap': info.marketCap
    };

    for (const metric in topMetrics) {
        const value = topMetrics[metric];
        let displayValue = 'N/A';
        let customClass = '';
        let animate = false;
        let prefix = '';
        let decimals = 2;
        if (value !== undefined && value !== null) {
            if (metric === 'Daily Change') {
                displayValue = value;
                customClass = changeClass;
            } else if (typeof value === 'number') {
                animate = true;
                if (metric === 'Market Cap') {
                    prefix = '\u20b9';
                    decimals = 0;
                } else if (metric === 'P/E Ratio') {
                    decimals = 2;
                } else {
                    prefix = '\u20b9';
                    decimals = 2;
                }
                displayValue = `<span class='metric-animate-number'>0</span>`;
            } else {
                displayValue = value;
            }
        }
        metricsContainer.innerHTML += `
            <div class='metric-card glass-effect'>
                <h3 style='color: var(--color-secondary); margin:0'>${metric}</h3>
                <h2 class='${customClass}' style='color: var(--color-primary); margin:0'>${displayValue}</h2>
            </div>
        `;
    }
    // Animate numbers after rendering
    setTimeout(() => {
        const cards = metricsContainer.querySelectorAll('.metric-card');
        let i = 0;
        for (const metric in topMetrics) {
            const value = topMetrics[metric];
            if (typeof value === 'number') {
                const numEl = cards[i].querySelector('.metric-animate-number');
                if (numEl) {
                    let prefix = '';
                    let decimals = 2;
                    if (metric === 'Market Cap') { prefix = '\u20b9'; decimals = 0; }
                    else if (metric === 'P/E Ratio') { decimals = 2; }
                    else { prefix = '\u20b9'; decimals = 2; }
                    animateNumber(numEl, value, prefix, 1200, decimals);
                }
            }
            i++;
        }
    }, 100);

    // Company Overview Section
    if (info.longBusinessSummary) {
        document.getElementById('overview-symbol').textContent = stockSearchInput.value;
        document.getElementById('business-summary').textContent = info.longBusinessSummary;
        document.getElementById('industry').textContent = info.industry || 'N/A';
        document.getElementById('sector').textContent = info.sector || 'N/A';
        
        const websiteLink = document.getElementById('website');
        if (info.website) {
            websiteLink.href = info.website;
            websiteLink.textContent = new URL(info.website).hostname;
        } else {
            websiteLink.href = "#";
            websiteLink.textContent = "N/A";
        }
        document.getElementById('employees').textContent = info.fullTimeEmployees ? info.fullTimeEmployees.toLocaleString() : 'N/A';

        overviewSection.style.display = 'block';
    } else {
        overviewSection.style.display = 'none';
    }

    // Secondary Metrics
    secondaryMetricsContainer.innerHTML = ''; // Clear previous
    const secondaryMetrics = {
        'Dividend Yield': info.dividendYield,
        'Beta': info.beta,
        'EPS (Trailing)': info.trailingEps,
        'Book Value': info.bookValue, // New metric
        '52W Low': info.fiftyTwoWeekLow, // New metric
        'Avg. Volume (10d)': info.averageDailyVolume10Day // New metric
    };

    for (const metric in secondaryMetrics) {
        const value = secondaryMetrics[metric];
        let displayValue = 'N/A';
        if (value !== undefined && value !== null) {
            if (typeof value === 'number') {
                if (metric.includes('Yield')) {
                    displayValue = `${(value * 100).toFixed(2)}%`;
                } else if (metric.includes('Volume')) {
                    displayValue = value.toLocaleString();
                } else {
                    displayValue = value.toFixed(2);
                }
            } else {
                displayValue = value;
            }
        }
        secondaryMetricsContainer.innerHTML += `
            <div class='metric-card glass-effect'>
                <h3 style='color: var(--color-secondary); margin:0'>${metric}</h3>
                <h2 style='color: var(--color-primary); margin:0'>${displayValue}</h2>
            </div>
        `;
    }
}

/**
 * Fetches and displays simulated AI market insights.
 */
async function loadAISentiment() {
    console.log("loadAISentiment(): Function started.");
    try {
        const response = await fetch(`${API_BASE_URL}/api/sentiment`);
        console.log("loadAISentiment(): Fetch response received.", response);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown API error" }));
            console.error("loadAISentiment(): API response not OK.", errorData);
            throw new Error(errorData.detail || `Failed to fetch AI sentiment: HTTP status ${response.status}`);
        }
        const data = await response.json();
        console.log("loadAISentiment(): API data received:", data);

        const forecastColorClass = data.forecast >= 0 ? 'positive-change' : 'negative-change';
        const forecastIcon = data.forecast >= 0 ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';

        aiInsightsSection.innerHTML = `
            <h2>AI MARKET INSIGHTS <i class="fas fa-brain"></i></h2>
            <div class='ai-metrics-row'>
                <div class='ai-metric-item'>
                    <h3>7-Day Forecast</h3>
                    <div class='ai-metric-value ${forecastColorClass}'>
                        ${data.forecast}% ${forecastIcon}
                    </div>
                </div>
                <div class='ai-metric-item'>
                    <h3>Market Sentiment</h3>
                    <div class='ai-sentiment-bar'>
                        <div class='sentiment-fill positive-sentiment' style='width: ${data.bullish}%;'></div>
                        <div class='sentiment-fill negative-sentiment' style='width: ${data.bearish}%;'></div>
                    </div>
                    <div class='sentiment-labels'>
                        <span class='positive-change'>Bullish ${data.bullish}%</span>
                        <span class='negative-change'>Bearish ${data.bearish}%</span>
                    </div>
                </div>
            </div>
            <div class='disclaimer'>
                📌 Note: AI predictions are simulated for demonstration purposes only.
                This is not financial advice. Past performance does not guarantee future results.
                Always conduct your own research.
            </div>
        `;
        console.log("loadAISentiment(): Rendering complete.");
    } catch (error) {
        console.error("loadAISentiment(): Critical error:", error);
        aiInsightsSection.innerHTML = `<p style="color: var(--color-negative); text-align: center;">Failed to load AI insights.</p>`;
    }
}

/**
 * Simulates fetching news articles for the selected stock.
 * @param {string} symbol - The stock symbol for which to fetch news.
 */
async function loadNews(symbol) {
    console.log("loadNews(): Function started.");
    if (!symbol) {
        console.log("loadNews(): No symbol selected, hiding news section.");
        newsSection.style.display = 'none';
        return;
    }

    newsSection.style.display = 'block';
    document.getElementById('news-symbol').textContent = `for ${symbol}`;
    newsList.innerHTML = '<p style="text-align: center; color: var(--text-color-medium);">Retrieving latest market intelligence...</p>';

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500)); // Slightly longer delay

    // More dynamic simulated news data
    const newsKeywords = ["earnings", "partnership", "innovation", "market outlook", "investment", "growth", "challenge", "expansion", "strategic move", "analyst rating"];
    const sentiments = ["optimistic", "favorable", "neutral", "cautious", "challenging"];
    const sources = ["Data Horizon Digest", "Global Financial Insights", "Quantum Market Analyst", "Apex Investor News"];

    const generateRandomNews = (sym) => {
        const numArticles = Math.floor(Math.random() * 3) + 3; // 3 to 5 articles
        const articles = [];
        for (let i = 0; i < numArticles; i++) {
            const keyword = newsKeywords[Math.floor(Math.random() * newsKeywords.length)];
            const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
            const source = sources[Math.floor(Math.random() * sources.length)];
            const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // Last 30 days

            articles.push({
                title: `${sym}: ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} outlook - ${sentiment}.`,
                summary: `Experts discuss ${sym}'s recent ${keyword}, with a generally ${sentiment} outlook for the coming quarter, despite market fluctuations.`,
                url: `https://example.com/news/${sym}-${keyword}-${i}`,
                source: source,
                date: date
            });
        }
        return articles;
    };

    const simulatedNews = generateRandomNews(symbol);

    newsList.innerHTML = ''; // Clear loading message

    if (simulatedNews.length > 0) {
        console.log(`loadNews(): ${simulatedNews.length} simulated news articles.`);
        simulatedNews.forEach(article => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'news-article';
            articleDiv.innerHTML = `
                <h3><a href="${article.url}" target="_blank"><i class="fas fa-arrow-right"></i> ${article.title}</a></h3>
                <p>${article.summary}</p>
                <div class="source-date">Source: ${article.source} <span class="bullet-separator"></span> Date: ${article.date}</div>
            `;
            newsList.appendChild(articleDiv);
        });
    } else {
        console.warn("loadNews(): No simulated news articles found.");
        newsList.innerHTML = '<p style="text-align: center; color: var(--text-color-medium);">No recent market intelligence found for this stock. The data stream is quiet.</p>';
    }
    console.log("loadNews(): Function finished.");
}

/**
 * Animates section entrances on scroll using IntersectionObserver.
 */
function animateSectionsOnScroll() {
    const sections = document.querySelectorAll('.animated-section');
    const observer = new window.IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    sections.forEach(section => observer.observe(section));
}
/**
 * Animates numbers in metric cards to count up smoothly.
 * @param {HTMLElement} el - The element to animate.
 * @param {number} end - The final value.
 * @param {string} prefix - Optional prefix (e.g., currency).
 * @param {number} duration - Animation duration in ms.
 * @param {number} decimals - Number of decimals.
 */
function animateNumber(el, end, prefix = '', duration = 1200, decimals = 2) {
    const start = 0;
    const startTime = performance.now();
    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = start + (end - start) * progress;
        el.textContent = prefix + value.toLocaleString('en-IN', { maximumFractionDigits: decimals });
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = prefix + end.toLocaleString('en-IN', { maximumFractionDigits: decimals });
        }
    }
    requestAnimationFrame(update);
}

// Ensure initial search suggestions are loaded once on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // This part is now handled by the initial try-catch block for full page load sequence
});