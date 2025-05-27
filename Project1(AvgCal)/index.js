const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 9876;


const WINDOW_SIZE = 10;
const API_TIMEOUT = 500;
const BASE_API_URL = 'http://20.244.56.144/evaluation-service'; 
const REGISTER_API_URL = `${BASE_API_URL}/register`; 



let numberStore = {
  windowState: [],
  lastRequestTime: null
};


let accessToken ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ4MzI1NjQxLCJpYXQiOjE3NDgzMjUzNDEsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjE1NjYzNzM2LTM4YWMtNDI3MC04MjgxLTNhNzAyNTliYWQ3YyIsInN1YiI6IjIzMzE1YTA1MDNAY3NlLnNyZWVuaWRoaS5lZHUuaW4ifSwiZW1haWwiOiIyMzMxNWEwNTAzQGNzZS5zcmVlbmlkaGkuZWR1LmluIiwibmFtZSI6InZpamF5IHZhcm1hIiwicm9sbE5vIjoiMjMzMTVhMDUwMyIsImFjY2Vzc0NvZGUiOiJQQ3FBVUsiLCJjbGllbnRJRCI6IjE1NjYzNzM2LTM4YWMtNDI3MC04MjgxLTNhNzAyNTliYWQ3YyIsImNsaWVudFNlY3JldCI6IkFZQnp6dFVCVEFSdW1uRnkifQ.G7jf8MdrXBK36zybMgwXd3G5sBR-FZaVe6p9k7Nr3zo";





const apiEndpoints = {
  'p': `${BASE_API_URL}/primes`,
  'f': `${BASE_API_URL}/fibo`,
  'e': `${BASE_API_URL}/even`,
  'r': `${BASE_API_URL}/rand`
};




app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;

  
  if (!['p', 'f', 'e', 'r'].includes(numberid)) {
    return res.status(400).json({
      error: 'Invalid number ID. Use p (prime), f (fibonacci), e (even), or r (random).'
    });
  }

  // Check if we have an access token.
  if (!accessToken) {
      console.warn('Access token not available.');
      return res.status(503).json({
          windowPrevState: numberStore.windowState,
          windowCurrState: numberStore.windowState,
          numbers: [],
          avg: calculateAverage(numberStore.windowState).toFixed(2),
          error: 'Service unavailable: Access token not obtained. Please check server logs for registration errors.'
      });
  }

  try {
    const windowPrevState = [...numberStore.windowState];
    const apiUrl = apiEndpoints[numberid];

    // Fetch numbers from third-party API
    const response = await axios.get(apiUrl, {
        timeout: API_TIMEOUT,
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const fetchedNumbers = response.data.numbers || [];

    updateWindowState(fetchedNumbers);
    const avg = calculateAverage(numberStore.windowState);

    const result = {
      windowPrevState,
      windowCurrState: numberStore.windowState,
      numbers: fetchedNumbers,
      avg: avg.toFixed(2)
    };

    res.json(result);

  } catch (error) {
    console.error('Error fetching numbers:', error.message);
    if (error.response && error.response.status === 401) {
        console.error('Unauthorized: Access token might be invalid or expired');
        accessToken = null; 
       
        return res.status(401).json({
            windowPrevState: numberStore.windowState,
            windowCurrState: numberStore.windowState,
            numbers: [],
            avg: calculateAverage(numberStore.windowState).toFixed(2),
            error: 'Authorization failed: Access token expired or invalid. Please retry.'
        });
    }

    const avg = calculateAverage(numberStore.windowState);
    const result = {
      windowPrevState: numberStore.windowState,
      windowCurrState: numberStore.windowState,
      numbers: [],
      avg: avg.toFixed(2),
      error: 'Failed to fetch numbers from third-party API'
    };
    res.json(result);
  }
});


function updateWindowState(newNumbers) {
    const uniqueNewNumbers = newNumbers.filter(num => !numberStore.windowState.includes(num));
    if (uniqueNewNumbers.length === 0) return;

    if (numberStore.windowState.length + uniqueNewNumbers.length <= WINDOW_SIZE) {
        numberStore.windowState = [...numberStore.windowState, ...uniqueNewNumbers];
    } else {
        const spaceAvailable = WINDOW_SIZE - numberStore.windowState.length;
        if (spaceAvailable > 0) {
            numberStore.windowState = [...numberStore.windowState, ...uniqueNewNumbers.slice(0, spaceAvailable)];
            const remainingNewNumbers = uniqueNewNumbers.slice(spaceAvailable);
            numberStore.windowState = [
                ...numberStore.windowState.slice(remainingNewNumbers.length),
                ...remainingNewNumbers
            ];
        } else {
            numberStore.windowState = [
                ...numberStore.windowState.slice(uniqueNewNumbers.length),
                ...uniqueNewNumbers
            ];
        }
    }
}

function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
}


app.listen(PORT, async () => {
  console.log(`Average Calculator Microservice running on http://localhost:${PORT}`);
});
