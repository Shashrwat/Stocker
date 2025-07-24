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

    // Initialize tsParticles background
    console.log("script.js: Calling loadParticles()...");
    await loadParticles().catch(e => console.error("script.js: Error in loadParticles:", e));
    console.log("script.js: loadParticles() finished.");

    console.log("script.js: Setting up event listeners.");
    
    // Event listener for stock search input (for recommendations)
    stockSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = stockSearchInput.value.trim();
            if (query.length > 0) {
                searchAndSuggestSymbols(query);
            } else {
                stockSuggestionsDatalist.innerHTML = ''; // Clear suggestions if input is empty
            }
        }, SEARCH_DEBOUNCE_TIME);
    });

    // Event listener for when a suggestion is selected OR user types and presses Enter
    stockSearchInput.addEventListener('change', async () => {
        const selectedSymbol = stockSearchInput.value.trim();
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

    // Initial load of data for a default stock (e.g., RELIANCE or the first one if not available)
    // We'll try to pre-fill the search input and load data.
    // This requires a initial call to load symbols to set a default.
    try {
        await searchAndSuggestSymbols(""); // Load all symbols initially to pick a default
        const defaultSymbol = stockSuggestionsDatalist.querySelector('option')?.value || "RELIANCE";
        if (defaultSymbol) {
            stockSearchInput.value = defaultSymbol; // Set the default in the input
            await loadStockDataAndCharts(defaultSymbol);
            await loadAISentiment();
            await loadNews(defaultSymbol);
        }
    } catch (error) {
        console.error("script.js: Initialization chain failed:", error);
        showMessage("Failed to load initial data. Please try again or search for a stock.", "error");
    }
    
    console.log("script.js: DOMContentLoaded block finished.");
});


/**
 * Initializes the tsParticles background animation with a more intricate configuration.
 */
async function loadParticles() {
    console.log("loadParticles(): Function started.");
    try {
        await tsParticles.load({
            id: "tsparticles",
            options: {
                background: {
                    color: { value: "transparent" },
                },
                fpsLimit: 120, // Higher FPS for smoother animation
                interactivity: {
                    events: {
                        onClick: {
                            enable: true,
                            mode: "push",
                        },
                        onHover: {
                            enable: true,
                            mode: "attract", // Changed to attract for a pull effect
                            parallax: {
                                enable: true,
                                force: 60,
                                smooth: 10,
                            },
                        },
                        resize: true,
                    },
                    modes: {
                        push: {
                            quantity: 4,
                        },
                        attract: {
                            distance: 200,
                            duration: 0.8,
                            easing: "ease-out-quad", // Smoother easing
                            factor: 1,
                            maxSpeed: 50,
                            speed: 1
                        },
                        repulse: { // Keep repulse as an alternative or for another mode
                            distance: 150,
                            duration: 0.5,
                        },
                    },
                },
                particles: {
                    color: {
                        // More subtle and varied cosmic colors
                        value: ["#00f2fe", "#4facfe", "#ff6b6b", "#e0e0e0", "#8a2be2"],
                    },
                    links: {
                        color: {
                            value: "#ffffff", // White links
                        },
                        distance: 150,
                        enable: true,
                        opacity: 0.4, // Slightly more opaque links
                        width: 1.5, // Thicker links
                        triangles: { // Add triangles between connected particles for more visual interest
                            enable: true,
                            color: {
                                value: "#ffffff"
                            },
                            opacity: 0.05
                        }
                    },
                    move: {
                        direction: "none",
                        enable: true,
                        outModes: {
                            default: "bounce",
                        },
                        random: true, // Random movement for more organic feel
                        speed: 1, // Slower speed
                        straight: false,
                        attract: {
                            enable: true,
                            rotateX: 600,
                            rotateY: 1200
                        },
                    },
                    number: {
                        density: {
                            enable: true,
                            area: 800,
                        },
                        value: 120, // More particles
                    },
                    opacity: {
                        value: { min: 0.3, max: 0.7 }, // Varied opacity
                        animation: {
                            enable: true,
                            speed: 0.5,
                            sync: false,
                            startValue: "random",
                            destroy: "none"
                        }
                    },
                    shape: {
                        type: ["circle", "star"], // Add stars
                        options: {
                            star: {
                                sides: 5 // Default star sides
                            }
                        }
                    },
                    size: {
                        value: { min: 1, max: 4 }, // Smaller, varied sizes
                        animation: {
                            enable: true,
                            speed: 2,
                            sync: false,
                            startValue: "random",
                            destroy: "none"
                        }
                    },
                    collisions: { // Enable collisions for bouncing effect
                        enable: true,
                    },
                },
                detectRetina: true,
                fullScreen: { // Ensure it covers the whole screen
                    enable: true,
                    zIndex: -1
                }
            },
        });
        console.log("loadParticles(): tsParticles.load completed.");
    } catch (e) {
        console.error("loadParticles(): Error during tsParticles.load:", e);
        throw e; // Re-throw to propagate error
    }
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
        showMessage(`Error searching symbols: ${error.message}`, "error");
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
            increasing: { line: { color: 'var(--color-primary)' } },
            decreasing: { line: { color: 'var(--color-accent)' } }
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
            text: `<b>${symbol} Price Chart</b>`,
            font: { size: 24, color: 'var(--color-primary)', family: 'Orbitron, sans-serif' }
        },
        height: 500,
        xaxis: { 
            rangeslider: { visible: false }, 
            showgrid: false, 
            zeroline: false,
            tickfont: { color: 'white' },
            type: 'date',
            title: { text: 'Date', font: { color: 'white' } }
        },
        yaxis: { 
            showgrid: false, 
            zeroline: false,
            tickfont: { color: 'white' },
            title: { text: 'Price', font: { color: 'white' } }
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0.3)',
        font: { color: 'white', family: 'Roboto, sans-serif' },
        margin: { t: 60, b: 60, l: 60, r: 60 },
        hovermode: 'x unified',
        legend: {
            x: 0, y: 1.1,
            bgcolor: 'rgba(0,0,0,0)',
            bordercolor: 'rgba(0,0,0,0)',
            font: { color: 'white' }
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
                return close >= open ? 'rgba(0, 242, 254, 0.7)' : 'rgba(255, 107, 107, 0.7)';
            }), 
            line: { width: 0 }
        }
    };
    const layout = {
        title: {
            text: '<b>Daily Volume</b>',
            font: { size: 20, color: 'var(--color-primary)', family: 'Orbitron, sans-serif' }
        },
        height: 300,
        xaxis: { showgrid: false, zeroline: false, tickfont: { color: 'white' }, type: 'date', title: { text: 'Date', font: { color: 'white' } } },
        yaxis: { showgrid: false, zeroline: false, tickfont: { color: 'white' }, title: { text: 'Volume', font: { color: 'white' } } },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0.3)',
        font: { color: 'white', family: 'Roboto, sans-serif' },
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
            colors: ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-accent)', '#8a2be2'], // Added another color
            line: { color: 'white', width: 2 }
        },
        textinfo: 'percent+label',
        hoverinfo: 'label+percent+value',
        textfont: {
            color: 'white' // Text on pie slices
        }
    };
    const layout = {
        title: {
            text: '<b>Ownership Structure</b>',
            font: { size: 20, color: 'var(--color-primary)', family: 'Orbitron, sans-serif' }
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0.3)',
        font: { color: 'white', family: 'Roboto, sans-serif' },
        margin: { t: 60, b: 60, l: 60, r: 60 },
        legend: {
            font: { color: 'white' }
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
        marker: { color: 'rgba(79,172,254,0.6)', line: { color: 'rgba(79,172,254,0.9)', width: 1 } },
        name: 'Returns Histogram'
    };

    const layout = {
        title: {
            text: '<b>Daily Returns Distribution</b>',
            font: { size: 20, color: 'var(--color-primary)', family: 'Orbitron, sans-serif' }
        },
        xaxis: { title: 'Daily Returns', showgrid: false, zeroline: false, tickfont: { color: 'white' } },
        yaxis: { title: 'Density', showgrid: false, zeroline: false, tickfont: { color: 'white' } },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0.3)',
        font: { color: 'white', family: 'Roboto, sans-serif' },
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

        if (value !== undefined && value !== null) {
            if (metric === 'Daily Change') {
                displayValue = value;
                customClass = changeClass; // Apply change color class
            } else if (typeof value === 'number') {
                if (metric === 'Market Cap') {
                    displayValue = `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                } else if (metric === 'P/E Ratio') {
                    displayValue = value.toFixed(2);
                } else {
                    displayValue = `₹${value.toFixed(2)}`;
                }
            } else {
                displayValue = value;
            }
        }
        metricsContainer.innerHTML += `
            <div class='metric-glow'>
                <h3 style='color: var(--color-secondary); margin:0'>${metric}</h3>
                <h2 class='${customClass}' style='color: var(--color-primary); margin:0'>${displayValue}</h2>
            </div>
        `;
    }

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
        'Average Volume (10d)': info.averageDailyVolume10Day // New metric
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
            <div class='metric-glow'>
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
            <h2 style='color: var(--color-primary); text-align: center;'>AI Market Insights 🔮</h2>
            <div class='ai-metrics-row'>
                <div class='ai-metric-item'>
                    <h3 style='color: var(--color-secondary);'>7-Day Forecast</h3>
                    <div class='ai-metric-value ${forecastColorClass}'>
                        ${data.forecast}% ${forecastIcon}
                    </div>
                </div>
                <div class='ai-metric-item'>
                    <h3 style='color: var(--color-secondary);'>Market Sentiment</h3>
                    <div class='ai-sentiment-bar'>
                        <div class='sentiment-fill bullish' style='width: ${data.bullish}%;'></div>
                        <div class='sentiment-fill bearish' style='width: ${data.bearish}%;'></div>
                    </div>
                    <div class='sentiment-labels'>
                        <span class='positive-change'>Bullish ${data.bullish}% <i class="fas fa-chart-line"></i></span>
                        <span class='negative-change'>Bearish ${data.bearish}% <i class="fas fa-chart-line-down"></i></span>
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
        aiInsightsSection.innerHTML = `<p style="color: var(--color-accent); text-align: center;">Failed to load AI insights.</p>`;
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
    newsList.innerHTML = '<p style="text-align: center; color: #ccc;">Fetching latest news from the void...</p>';

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500)); // Slightly longer delay

    // More dynamic simulated news data
    const newsKeywords = ["earnings", "partnership", "innovation", "market outlook", "investment", "growth", "challenge", "expansion"];
    const sentiments = ["bullish", "positive", "neutral", "bearish", "caution"];
    const sources = ["Stocker Herald", "Galaxy Finance", "Quantum Investor", "Cosmic Market News"];

    const generateRandomNews = (sym) => {
        const numArticles = Math.floor(Math.random() * 3) + 3; // 3 to 5 articles
        const articles = [];
        for (let i = 0; i < numArticles; i++) {
            const keyword = newsKeywords[Math.floor(Math.random() * newsKeywords.length)];
            const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
            const source = sources[Math.floor(Math.random() * sources.length)];
            const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // Last 30 days

            articles.push({
                title: `${sym} ${keyword} analysis: ${sentiment} outlook.`,
                summary: `Latest reports indicate significant developments in ${sym}'s ${keyword} sector, leading to a ${sentiment} market sentiment.`,
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
                <h3><a href="${article.url}" target="_blank"><i class="fas fa-newspaper"></i> ${article.title}</a></h3>
                <p>${article.summary}</p>
                <div class="source-date">Source: ${article.source} <span class="bullet-separator"></span> Date: ${article.date}</div>
            `;
            newsList.appendChild(articleDiv);
        });
    } else {
        console.warn("loadNews(): No simulated news articles found.");
        newsList.innerHTML = '<p style="text-align: center; color: #ccc;">No recent cosmic news found for this stock. The void is silent.</p>';
    }
    console.log("loadNews(): Function finished.");
}

// Initial symbol search and data load (on page load)
// This will trigger the initial data fetch for a default stock
document.addEventListener('DOMContentLoaded', () => {
    // No direct call to loadSymbols anymore.
    // The initial load in DOMContentLoaded will call searchAndSuggestSymbols
    // to populate the datalist, and then load the default stock.
});