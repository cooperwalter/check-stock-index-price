const functions = require('@google-cloud/functions-framework');

const SP500_STICKER = "FLX";

/**
 * Checks if a stock symbol exists in the US exchange.
 * @param {string} stockSymbol - The stock symbol to check.
 * @returns {Promise<boolean>} - A promise that resolves to true if the symbol exists, otherwise false.
 * @throws Will throw an error if the fetch operation fails.
 */
async function symbolExists(stockSymbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  const endpoint = `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${apiKey}`;
  const response = await fetch(endpoint);
  if (response.status !== 200) {
    throw new Error("Failed to fetch stock symbols");
  }
  const symbols = await response.json();
  return symbols.some((symbol) => symbol.symbol === stockSymbol);
}

/**
 * Fetches the current stock price for a given stock symbol.
 * @param {string} stockSymbol - The stock symbol to fetch the price for.
 * @returns {Promise<number>} - A promise that resolves to the stock price at previous close.
 * @throws Will throw an error if the fetch operation fails.
 */
async function getStockPrice(stockSymbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  const endpoint = "https://finnhub.io/api/v1/quote?symbol=" + stockSymbol + "&token=" + apiKey;
  const response = await fetch(endpoint);
  if (response.status !== 200) {
    throw new Error("Failed to fetch stock price");
  }
  const data = await response.json();
  return data.pc; // price at previous close
}

functions.http('check-stock-price', async (req, res) => {
  const stockSymbol = req.query.symbol || SP500_STICKER;
  const price = await getStockPrice(stockSymbol);
  res.send(`The price of ${stockSymbol} is ${price}`);
});

// Create an express server for local testing

if (process.env.ENVIRONMENT === 'dev') {
  const express = require('express');
  const app = express();

  app.get('/', (req, res) => {
    res.send('Hello World');
  });

  /**
   * Express route handler for fetching stock price by symbol.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  app.get('/stock/:symbol?', async (req, res) => {
    if (process.env.FINNHUB_API_KEY === "INSERT_YOUR_API_KEY_HERE") {
      res.status(500).send("Please set the FINNHUB_API_KEY environment variable");
      return;
    }
    const stockSymbol = req.params.symbol || SP500_STICKER;
    if (!req.params.symbol) {
      console.warn("No symbol provided, defaulting to SP500 ticker: " + SP500_STICKER);
    }
    const symbol = stockSymbol.toUpperCase();
    try {
      if (!await symbolExists(symbol)) {
        res.status(404).send("Stock symbol not found");
        return;
      }
      const price = await getStockPrice(symbol);
      res.send(`The price of ${symbol} is ${price}`);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
}
