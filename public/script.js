// Stocker/public/script.js

// Determine the API base URL. On Render, it will be the same origin as your frontend.
const API_BASE_URL = window.location.origin;

// DOM Elements
const stockSelect = document.getElementById('stock-select');
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

// --- EXTENSIVE LOGGING ADDED HERE ---
console.log("script.js: Starting script execution.");

document.addEventListener('DOMContentLoaded', async () => {
    console.log("script.js: DOMContentLoaded event fired. Starting initial async operations.");

    // Initialize tsParticles background
    console.log("script.js: Calling loadParticles()...");
    await loadParticles().catch(e => console.error("script.js: Error in loadParticles:", e));
    console.log("script.js: loadParticles() finished.");

    // Initial load of symbols and data
    console.log("script.js: Calling loadSymbols()...");
    loadSymbols().then(() => {
        console.log("script.js: loadSymbols() finished successfully. Calling loadStockDataAndCharts()...");
        return loadStockDataAndCharts();
    }).then(() => {
        console.log("script.js: loadStockDataAndCharts() finished. Calling loadAISentiment()...");
        return loadAISentiment();
    }).then(() => {
        console.log("script.js: loadAISentiment() finished. Calling loadNews()...");
        return loadNews();
    }).catch(error => {
        console.error("script.js: Initialization chain failed:", error);
        showMessage("Failed to load initial data. Please try again.", "error");
    });
    
    console.log("script.js: Setting up event listeners.");
    // Add event listeners for changes in select boxes
    stockSelect.addEventListener('change', async () => {
        console.log("script.js: Stock selection changed. Calling loadStockDataAndCharts()...");
        await loadStockDataAndCharts();
        console.log("script.js: Stock selection changed. Calling loadNews()...");
        await loadNews(); // Reload news when stock changes
    });
    periodSelect.addEventListener('change', () => { console.log("script.js: Period changed. Calling loadStockDataAndCharts()..."); loadStockDataAndCharts(); });
    chartSelect.addEventListener('change', () => { console.log("script.js: Chart style changed. Calling loadStockDataAndCharts()..."); loadStockDataAndCharts(); });
    indicatorSelect.addEventListener('change', () => { console.log("script.js: Indicator changed. Calling loadStockDataAndCharts()..."); loadStockDataAndCharts(); });

    console.log("script.js: DOMContentLoaded block finished.");
});

/**
 * Initializes the tsParticles background animation.
 */
async function loadParticles() {
    console.log("loadParticles(): Function started.");
    try {
        await tsParticles.load({
            id: "tsparticles",
            options: {
                background: {
                    color: {
                        value: "transparent", // Background handled by CSS gradient
                    },
                },
                fpsLimit: 60,
                interactivity: {
                    events: {
                        onClick: {
                            enable: true,
                            mode: "push",
                        },
                        onHover: {
                            enable: true,
                            mode: "repulse",
                        },
                        resize: true,
                    },
                    modes: {
                        push: {
                            quantity: 4,
                        },
                        repulse: {
                            distance: 100,
                            duration: 0.4,
                        },
                    },
                },
                particles: {
                    color: {
                        value: ["#00f2fe", "#4facfe", "#ff6b6b"], // Cosmic colors
                    },
                    links: {
                        color: "#ffffff",
                        distance: 150,
                        enable: true,
                        opacity: 0.3,
                        width: 1,
                    },
                    move: {
                        direction: "none",
                        enable: true,
                        outModes: {
                            default: "bounce",
                        },
                        random: false,
                        speed: 1,
                        straight: false,
                    },
                    number: {
                        density: {
                            enable: true,
                            area: 800,
                        },
                        value: 80,
                    },
                    opacity: {
                        value: 0.5,
                    },
                    shape: {
                        type: "circle",
                    },
                    size: {
                        value: { min: 1, max: 5 },
                    },
                },
                detectRetina: true,
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
    // console.log(`showMessage(): Displaying ${type} message: ${message}`);
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
    // console.log(`toggleLoading(): ${show ? 'Showing' : 'Hiding'} spinner.`);
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

/**
 * Fetches stock symbols from the backend API and populates the stock select dropdown.
 */
async function loadSymbols() {
    console.log("loadSymbols(): Function started.");
    toggleLoading(true);
    try {
        console.log(`loadSymbols(): Fetching from ${API_BASE_URL}/api/symbols`);
        const response = await fetch(`${API_BASE_URL}/api/symbols`);
        let data;
        try {
            data = await response.json();
        } catch (jsonErr) {
            data = { detail: "Invalid JSON from API" };
        }
        console.log("loadSymbols(): API data received:", data);

        if (!response.ok) {
            console.error("loadSymbols(): API response not OK.", data);
            throw new Error(data.detail || `Failed to fetch symbols: HTTP status ${response.status}`);
        }

        stockSelect.innerHTML = '';
        const loadingOption = document.createElement('option');
        loadingOption.value = "";
        loadingOption.textContent = "Loading symbols...";
        loadingOption.disabled = true;
        loadingOption.selected = true;
        stockSelect.appendChild(loadingOption);

        if (data.symbols && Array.isArray(data.symbols) && data.symbols.length > 0) {
            stockSelect.innerHTML = '';
            
data.symbols.slice(0, 100).forEach(symbol => {
    const option = document.createElement('option');
    option.value = symbol;
    option.textContent = `📈 ${symbol}`;
    stockSelect.appendChild(option);
});
// ...existing code...
            if (data.symbols.includes("RELIANCE")) {
                stockSelect.value = "RELIANCE";
            } else {
                stockSelect.value = data.symbols[0];
            }
            showMessage("Stock symbols loaded successfully!", "success");
        } else {
            stockSelect.innerHTML = '';
            const noDataOption = document.createElement('option');
            noDataOption.value = "";
            noDataOption.textContent = "No symbols found.";
            noDataOption.disabled = true;
            noDataOption.selected = true;
            stockSelect.appendChild(noDataOption);
            showMessage("No stock symbols found. The API might be empty or unavailable.", "error");
        }
    } catch (error) {
        console.error("loadSymbols(): Critical error:", error);
        showMessage(`Error loading symbols: ${error.message}. Check browser console.`, "error");
        stockSelect.innerHTML = '<option value="" disabled selected>Error loading symbols</option>';
    } finally {
        toggleLoading(false);
        console.log("loadSymbols(): Function finished.");
    }
}

/**
 * Fetches stock data from the backend API and renders all charts and metrics.
 */
async function loadStockDataAndCharts() {
    console.log("loadStockDataAndCharts(): Function started.");
    const symbol = stockSelect.value;
    const period = periodSelect.value;
    const chartType = chartSelect.value;
    const indicator = indicatorSelect.value;

    if (!symbol) {
        console.log("loadStockDataAndCharts(): No symbol selected, skipping data load.");
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
        renderAnalyticsPie(); // Static data
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
    // console.log("calculateSMA(): Calculating SMA...");
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < windowSize - 1) {
            sma.push(null); // Not enough data for the initial window
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
    // console.log("renderMainChart(): Rendering main chart...");
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
            text: `<b>${symbol} ${chartType.toUpperCase()} ANALYSIS</b>`,
            font: { size: 24, color: 'var(--color-primary)' }
        },
        height: 500,
        xaxis: { 
            rangeslider: { visible: false }, 
            showgrid: false, 
            zeroline: false,
            tickfont: { color: 'white' },
            type: 'date'
        },
        yaxis: { 
            showgrid: false, 
            zeroline: false,
            tickfont: { color: 'white' }
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0.3)',
        font: { color: 'white' },
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
    // console.log("renderVolumeBars(): Rendering volume chart...");
    const trace = {
        x: hist.map(d => d.date),
        y: hist.map(d => d.Volume),
        type: 'bar',
        marker: {
            color: hist.map(d => d.Volume), 
            colorscale: 'Tealgrn', 
            line: { width: 0 }
        }
    };
    const layout = {
        title: {
            text: '<b>VOLUME ANALYSIS</b>',
            font: { size: 20, color: 'var(--color-primary)' }
        },
        height: 300,
        xaxis: { showgrid: false, zeroline: false, tickfont: { color: 'white' }, type: 'date' },
        yaxis: { showgrid: false, zeroline: false, tickfont: { color: 'white' } },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0.3)',
        font: { color: 'white' },
        margin: { t: 60, b: 60, l: 60, r: 60 }
    };
    Plotly.newPlot(volumeChartDiv, [trace], layout);
}

/**
 * Renders the ownership structure pie chart (static data).
 */
function renderAnalyticsPie() {
    // console.log("renderAnalyticsPie(): Rendering ownership chart...");
    const trace = {
        labels: ['Institutional', 'Retail', 'Insider'],
        values: [45, 35, 20],
        hole: 0.5,
        type: 'pie',
        marker: {
            colors: ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-accent)'],
            line: { color: 'white', width: 2 }
        },
        textinfo: 'percent+label',
        hoverinfo: 'label+percent+value'
    };
    const layout = {
        title: {
            text: '<b>OWNERSHIP STRUCTURE</b>',
            font: { size: 20, color: 'var(--color-primary)' }
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0.3)',
        font: { color: 'white' },
        margin: { t: 60, b: 60, l: 60, r: 60 }
    };
    Plotly.newPlot(ownershipChartDiv, [trace], layout);
}

/**
 * Renders the returns distribution histogram.
 * @param {Array<Object>} hist - Historical data.
 */
function renderReturnsWave(hist) {
    // console.log("renderReturnsWave(): Rendering returns chart...");
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
        marker: { color: 'rgba(79,172,254,0.6)' },
        name: 'Returns Histogram'
    };

    const layout = {
        title: {
            text: '<b>RETURNS DISTRIBUTION</b>',
            font: { size: 20, color: 'var(--color-primary)' }
        },
        xaxis: { title: 'Daily Returns', showgrid: false, zeroline: false, tickfont: { color: 'white' } },
        yaxis: { title: 'Density', showgrid: false, zeroline: false, tickfont: { color: 'white' } },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0.3)',
        font: { color: 'white' },
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
    // console.log("updateInfoMetrics(): Updating metrics...");
    // Top Metrics
    metricsContainer.innerHTML = ''; // Clear previous
    const topMetrics = {
        'Current Price': hist[hist.length - 1].Close,
        '52W High': info.fiftyTwoWeekHigh,
        'P/E Ratio': info.trailingPE,
        'Market Cap': info.marketCap
    };

    for (const metric in topMetrics) {
        const value = topMetrics[metric];
        let displayValue = 'N/A';
        if (value !== undefined && value !== null) {
            if (typeof value === 'number') {
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
                <h2 style='color: var(--color-primary); margin:0'>${displayValue}</h2>
            </div>
        `;
    }

    // Company Overview Section
    if (info.longBusinessSummary) {
        document.getElementById('overview-symbol').textContent = stockSelect.value;
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
        'EPS': info.trailingEps
    };

    for (const metric in secondaryMetrics) {
        const value = secondaryMetrics[metric];
        let displayValue = 'N/A';
        if (value !== undefined && value !== null) {
            if (typeof value === 'number') {
                if (metric.includes('Yield')) {
                    displayValue = `${(value * 100).toFixed(2)}%`;
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

        const forecastColorClass = data.forecast >= 0 ? 'positive' : 'negative';
        const forecastIcon = data.forecast >= 0 ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';

        aiInsightsSection.innerHTML = `
            <h2 style='color: var(--color-primary); text-align: center;'>AI MARKET INSIGHTS 🔮</h2>
            <div class='ai-metrics-row'>
                <div class='ai-metric-item'>
                    <h3 style='color: var(--color-secondary);'>7-Day Forecast</h3>
                    <div class='ai-metric-value ${forecastColorClass}'>
                        ${data.forecast}% ${forecastIcon}
                    </div>
                </div>
                <div class='ai-metric-item'>
                    <h3 style='color: var(--color-secondary);'>Market Sentiment</h3>
                    <div class='ai-metric-value positive'>${data.bullish}% <i class="fas fa-smile"></i></div>
                    <div class='ai-metric-value neutral'>Bearish ${data.bearish}% <i class="fas fa-frown"></i></div>
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
 */
async function loadNews() {
    console.log("loadNews(): Function started.");
    const symbol = stockSelect.value;
    if (!symbol) {
        console.log("loadNews(): No symbol selected, hiding news section.");
        newsSection.style.display = 'none';
        return;
    }

    newsSection.style.display = 'block';
    document.getElementById('news-symbol').textContent = `for ${symbol}`;
    newsList.innerHTML = '<p style="text-align: center; color: #ccc;">Fetching latest news...</p>';

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulated news data (replace with actual API call in a real app)
    const simulatedNews = [
        {
            title: `Stocker analysts bullish on ${symbol}'s Q3 earnings.`,
            summary: `Experts predict strong growth driven by market demand.`,
            url: `https://example.com/news/${symbol}-q3-earnings`,
            source: 'Stocker Daily',
            date: '2024-07-23'
        },
        {
            title: `${symbol} announces new strategic partnership.`,
            summary: `Collaboration expected to open new revenue streams.`,
            url: `https://example.com/news/${symbol}-partnership`,
            source: 'Global Finance News',
            date: '2024-07-22'
        },
        {
            title: `Market volatility impacts ${symbol} stock performance.`,
            summary: `Analysts advise caution amid broader economic concerns.`,
            url: `https://example.com/news/${symbol}-volatility`,
            source: 'Market Watch',
            date: '2024-07-21'
        },
        {
            title: `Innovation at ${symbol}: A deep dive into their R&D.`,
            summary: `Company's commitment to innovation could drive long-term value.`,
            url: `https://example.com/news/${symbol}-innovation`,
            source: 'Tech Investor',
            date: '2024-07-20'
        }
    ];

    newsList.innerHTML = ''; // Clear loading message

    if (simulatedNews.length > 0) {
        console.log(`loadNews(): ${simulatedNews.length} simulated news articles.`);
        simulatedNews.forEach(article => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'news-article';
            articleDiv.innerHTML = `
                <h3><a href="${article.url}" target="_blank">${article.title}</a></h3>
                <p>${article.summary}</p>
                <div class="source-date">${article.source} - ${article.date}</div>
            `;
            newsList.appendChild(articleDiv);
        });
    } else {
        console.warn("loadNews(): No simulated news articles found.");
        newsList.innerHTML = '<p style="text-align: center; color: #ccc;">No recent news found for this stock.</p>';
    }
    console.log("loadNews(): Function finished.");
}
window.addEventListener('DOMContentLoaded', () => {
    loadSymbols();
});