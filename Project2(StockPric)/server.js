// Import packages
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const axios = require('axios');
const dotenv = require('dotenv');


dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize cache with 5 minute
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// stock exchange API
const STOCK_API_BASE_URL = process.env.STOCK_API_BASE_URL || 'http://20.244.56.144/evaluation-service';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const TOKEN_TYPE = process.env.TOKEN_TYPE || 'Bearer';

// Middleware
app.use(helmet()); 
app.use(cors()); 
app.use(express.json()); 
app.use(morgan('dev')); 

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});
const fetchFromApi = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `${TOKEN_TYPE} ${ACCESS_TOKEN}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`API request failed: ${url}`, error.message);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
};

const calculateAverage = (priceHistory) => {
  if (!priceHistory || priceHistory.length === 0) {
    return 0;
  }
  
  const sum = priceHistory.reduce((acc, item) => acc + parseFloat(item.price), 0);
  return sum / priceHistory.length;
};

const calculateCorrelation = (pricesA, pricesB) => {
  if (pricesA.length !== pricesB.length || pricesA.length === 0) {
    throw new Error('Price arrays must be of equal length and not empty');
  }

  const n = pricesA.length;
  
  // Extract just the price values
  const xValues = pricesA.map(item => parseFloat(item.price));
  const yValues = pricesB.map(item => parseFloat(item.price));
  
  // Calculate means
  const xMean = xValues.reduce((sum, val) => sum + val, 0) / n;
  const yMean = yValues.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate covariance and standard deviations
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    covariance += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }
  
  covariance /= (n - 1);
  xVariance /= (n - 1);
  yVariance /= (n - 1);
  
  const xStdDev = Math.sqrt(xVariance);
  const yStdDev = Math.sqrt(yVariance);
  
  // Calculate Pearson correlation coefficient
  const correlation = covariance / (xStdDev * yStdDev);
  
  // Round to 4 decimal
  return parseFloat(correlation.toFixed(4));
};

// API Routes
app.get('/api/stocks', async (req, res, next) => {
  try {
    const cacheKey = 'all_stocks';
    
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    
    const data = await fetchFromApi(`${STOCK_API_BASE_URL}/stocks`);
    const formattedData = {
      stocks: data.stocks || {}
    };
    
    cache.set(cacheKey, formattedData);
    
    res.json(formattedData);
  } catch (error) {
    next(error);
  }
});

// Get current price for a specific stock
app.get('/api/stocks/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const cacheKey = `stock_${ticker}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    

    const data = await fetchFromApi(`${STOCK_API_BASE_URL}/stocks/${ticker}`);
    
    // Format the response
    const formattedData = {
      stock: ticker,
      price: data.stock?.price || 0,
      lastUpdatedAt: data.stock?.lastUpdatedAt || new Date().toISOString()
    };
    
    // Store in cache (shorter TTL for current price)
    cache.set(cacheKey, formattedData, 60);
    
    res.json(formattedData);
  } catch (error) {
    next(error);
  }
});

// Get price history for a specific stock
app.get('/api/stocks/:ticker/history', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const minutes = parseInt(req.query.minutes) || 50;//default 50
    
    const cacheKey = `history_${ticker}_${minutes}`;
    
    // Check cache 
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Fetch from API if not in cache
    const data = await fetchFromApi(`${STOCK_API_BASE_URL}/stocks/${ticker}?minutes=${minutes}`);
    
    // Format the response
    const formattedData = {
      stock: ticker,
      timeRange: `${minutes} minutes`,
      priceHistory: Array.isArray(data) ? data : []
    };
    
    // Store in cache
    cache.set(cacheKey, formattedData);
    
    res.json(formattedData);
  } catch (error) {
    next(error);
  }
});

// Get average price for a specific stock
app.get('/api/stocks/:ticker/average', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const minutes = parseInt(req.query.minutes) || 50; 
    
    const cacheKey = `average_${ticker}_${minutes}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Fetch price history from API if not in cache
    const data = await fetchFromApi(`${STOCK_API_BASE_URL}/stocks/${ticker}?minutes=${minutes}`);
    
    // Extract price history
    const priceHistory = Array.isArray(data) ? data : [];
    
    // Calculate average price
    const averagePrice = calculateAverage(priceHistory);
    
    // Format the response
    const formattedData = {
      stock: ticker,
      timeRange: `${minutes} minutes`,
      averagePrice: parseFloat(averagePrice.toFixed(6)),
      priceHistory: priceHistory
    };
    
    // Store in cache
    cache.set(cacheKey, formattedData);
    
    res.json(formattedData);
  } catch (error) {
    next(error);
  }
});

// Get correlation between two stocks
app.get('/api/correlation', async (req, res, next) => {
  try {
    const { minutes, ticker1, ticker2 } = req.query;
    
    if (!ticker1 || !ticker2) {
      return res.status(400).json({ error: 'Both ticker1 and ticker2 parameters are required' });
    }
    
    const minutesValue = parseInt(minutes) || 50; // Default to 50 minutes if not specified
    
    const cacheKey = `correlation_${ticker1}_${ticker2}_${minutesValue}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Fetch price histories for both stocks
    const [stock1Data, stock2Data] = await Promise.all([
      fetchFromApi(`${STOCK_API_BASE_URL}/stocks/${ticker1}?minutes=${minutesValue}`),
      fetchFromApi(`${STOCK_API_BASE_URL}/stocks/${ticker2}?minutes=${minutesValue}`)
    ]);
    
    // Extract price histories
    const priceHistory1 = Array.isArray(stock1Data) ? stock1Data : [];
    const priceHistory2 = Array.isArray(stock2Data) ? stock2Data : [];
    
    // Ensure both price histories have the same length
    const minLength = Math.min(priceHistory1.length, priceHistory2.length);
    const trimmedHistory1 = priceHistory1.slice(0, minLength);
    const trimmedHistory2 = priceHistory2.slice(0, minLength);
    
    // Calculate correlation
    let correlation = 0;
    if (minLength > 1) {
      correlation = calculateCorrelation(trimmedHistory1, trimmedHistory2);
    }
    
    // Format the response
    const formattedData = {
      correlation: correlation,
      timeRange: `${minutesValue} minutes`,
      stocks: {
        [ticker1]: {
          averagePrice: calculateAverage(trimmedHistory1),
          priceHistory: trimmedHistory1
        },
        [ticker2]: {
          averagePrice: calculateAverage(trimmedHistory2),
          priceHistory: trimmedHistory2
        }
      }
    };
    
    // Store in cache
    cache.set(cacheKey, formattedData);
    
    res.json(formattedData);
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    auth: ACCESS_TOKEN ? 'Configured' : 'Missing'
  });
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Authentication: ${ACCESS_TOKEN ? 'Configured' : 'Missing'}`);
});

module.exports = app;
