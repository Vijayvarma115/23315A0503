# Average Calculator Microservice(Project1)

A REST API microservice that calculates the average of numbers fetched from external APIs, with window size management.

## Project Overview

This microservice exposes a REST API endpoint `/numbers/:numberid` that:
- Accepts qualified number IDs ('p' for prime, 'f' for Fibonacci, 'e' for even, 'r' for random)
- Fetches numbers from a third-party server
- Maintains a window of unique numbers (default size: 10)
- Calculates and returns the average of stored numbers


The service will run on http://localhost:9876 by default.

### API Endpoints

- **GET /numbers/p** - Fetch prime numbers
- **GET /numbers/f** - Fetch Fibonacci numbers
- **GET /numbers/e** - Fetch even numbers
- **GET /numbers/r** - Fetch random numbers

### ScreenShot's

1.![Screenshot 2025-05-27 112022](https://github.com/user-attachments/assets/6eee1203-c8da-4c21-adaa-41d2c5ba8da2)

2.![Screenshot 2025-05-27 112132](https://github.com/user-attachments/assets/2497076b-1930-43ff-a1c0-ebfaff3eb3bc)

3.![Screenshot 2025-05-27 112158](https://github.com/user-attachments/assets/072d8e65-6264-4d8e-ad54-0741bc7b0811)

4.![Screenshot 2025-05-27 112645](https://github.com/user-attachments/assets/d178d8b4-db32-4c1d-ab98-1b28bc0206dc)



# Stock Price Aggregation Microservice - Token Authentication

A backend microservice for aggregating and analyzing stock prices in real-time with secure token-based authentication.

## Features

- Secure API access with Bearer token authentication
- Get current stock prices and historical data
- Calculate average stock prices over specified time periods
- Analyze correlation between different stocks
- Robust caching for performance optimization
- Error handling and rate limiting


## API Endpoints

The microservice provides the following API endpoints:

- `GET /api/stocks` - Get all available stocks
- `GET /api/stocks/:ticker` - Get current price for a specific stock
- `GET /api/stocks/:ticker/history?minutes=m` - Get price history for a specific stock
- `GET /api/stocks/:ticker/average?minutes=m` - Get average price for a specific stock
- `GET /api/correlation?ticker1=SYMBOL1&ticker2=SYMBOL2&minutes=m` - Get correlation between two stocks
- `GET /health` - Check service health and authentication status


"The server will run on http://localhost:3001"


### Get price history for a specific stock
```
GET http://localhost:3001/api/stocks/NVDA/history?minutes=50
```

### Get average price for a specific stock
```
GET http://localhost:3001/api/stocks/NVDA/average?minutes=50
```

### Get correlation between two stocks
```
GET http://localhost:3001/api/correlation?ticker1=NVDA&ticker2=AAPL&minutes=50
```



### ScreenShots's:

1.![image](https://github.com/user-attachments/assets/a14f017b-b14c-40e3-9b91-69fc7c494545)

