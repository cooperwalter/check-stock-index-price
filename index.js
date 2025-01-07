const functions = require("@google-cloud/functions-framework");
const FirestoreService = require("./Firestore");
const Notifier = require("./Notifier");
const SP500_STICKER = "VOO";

/**
 * Validates that all required environment variables are set.
 * @throws Will throw an error if any required environment variable is not set.
 */
function validateEnvironment() {
  if (!process.env.FINNHUB_API_KEY) {
    throw new Error("FINNHUB_API_KEY env variable is not set");
  }
  if (!process.env.NOTIFIER_WEBHOOK_ENDPOINT) {
    throw new Error("NOTIFIER_WEBHOOK_ENDPOINT env variable is not set");
  }
  if (!process.env.PRICE_DROP_THRESHOLD_PERCENTAGE) {
    throw new Error("PRICE_DROP_THRESHOLD_PERCENTAGE env variable is not set");
  }
  if (!process.env.FIRESTORE_PROJECT_ID) {
    throw new Error("FIRESTORE_PROJECT_ID env variable is not set");
  }
  if (!process.env.FIRESTORE_DATABASE) {
    throw new Error("FIRESTORE_DATABASE env variable is not set");
  }
  if (!process.env.FIRESTORE_COLLECTION) {
    throw new Error("FIRESTORE_COLLECTION env variable is not set");
  }
}

validateEnvironment();
const firestore = new FirestoreService(
  process.env.FIRESTORE_PROJECT_ID,
  process.env.FIRESTORE_DATABASE,
  process.env.FIRESTORE_COLLECTION
);

const notifier = new Notifier(process.env.NOTIFIER_WEBHOOK_ENDPOINT);

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
  const endpoint =
    "https://finnhub.io/api/v1/quote?symbol=" +
    stockSymbol +
    "&token=" +
    apiKey;
  const response = await fetch(endpoint);
  if (response.status !== 200) {
    throw new Error("Failed to fetch stock price");
  }
  const data = await response.json();
  return data.pc; // price at previous close
}

/**
 * Retrieves the saved stock price from the Firestore database.
 * @param {string} stockSymbol - The stock symbol to retrieve the price for.
 * @returns {Promise<number|null>} - A promise that resolves to the saved stock price or null if not found.
 */
async function getSavedStockPrice(stockSymbol) {
  const doc = await firestore.findDocument("symbol", stockSymbol);
  return doc ? doc.data().price : null;
}

/**
 * Calculates the percentage change between the original price and the current price.
 * @param {number} originalPrice - The original stock price.
 * @param {number} currentPrice - The current stock price.
 * @returns {number} - The percentage change.
 */
function getPercentageChange(originalPrice, currentPrice) {
  return ((originalPrice - currentPrice) / originalPrice) * 100;
}

/**
 * Persists the stock price in the Firestore database.
 * If a document with the given stock symbol does not exist, it creates a new one.
 * Otherwise, it updates the existing document with the new price.
 *
 * @param {string} stockSymbol - The stock symbol to persist.
 * @param {number} price - The stock price to persist.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 * @throws Will log an error if the persistence operation fails.
 */
async function persistStockPrice(stockSymbol, price) {
  const doc = await firestore.findDocument("symbol", stockSymbol);
  try {
    if (!doc) {
      await firestore.createDocument({ symbol: stockSymbol, price });
    } else {
      await firestore.updateDocument(doc.id, { price });
    }
  } catch (error) {
    console.error("Failed to persist stock price", error);
  }
}

/**
 * HTTP handler for checking stock price.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function checkStockPrice(req, res) {
  if (process.env.FINNHUB_API_KEY === "INSERT_YOUR_API_KEY_HERE") {
    res.status(500).send("Please set the FINNHUB_API_KEY environment variable");
    return;
  }
  const stockSymbol = req.query.symbol || SP500_STICKER;
  if (!req.query.symbol) {
    console.warn(
      "No symbol provided, defaulting to SP500 ticker: " + SP500_STICKER
    );
  }
  const symbol = stockSymbol.toUpperCase();
  try {
    if (!(await symbolExists(symbol))) {
      res.status(404).send("Stock symbol not found");
      return;
    }
    const price = await getStockPrice(symbol);
    console.log("Found price: " + price);
    const savedPrice = await getSavedStockPrice(symbol);
    console.log("Saved price: " + savedPrice);
    console.log("Current price: " + price);
    // If we haven't saved the price yet, save it
    if (!savedPrice) {
      console.log("Saving price for the first time");
      await persistStockPrice(symbol, price);
    } else if (price <= savedPrice) {
      // If the price has dropped by more than the threshold, notify
      const percentageDrop = Math.abs(getPercentageChange(savedPrice, price));
      if (
        percentageDrop >= Number(process.env.PRICE_DROP_THRESHOLD_PERCENTAGE)
      ) {
        console.log("Price dropped by more than the threshold, notifying");
        await notifier.notify(savedPrice, price, percentageDrop.toFixed(2));
        console.log("Persisting new base price");
        await persistStockPrice(symbol, price);
      }
    }
    res.send(`The price of ${symbol} is ${price}`);
  } catch (error) {
    console.error("Failed with error: " + error.message);
    res.status(500).send(error.message);
  }
}

/**
 * Registers the HTTP function for checking stock price.
 */
functions.http("check-stock-price", checkStockPrice);

// TESTING
// Create an express server for local testing
if (process.env.ENVIRONMENT === "dev") {
  const express = require("express");
  const app = express();

  app.get("/", (_req, res) => {
    res.send("Hello World");
  });

  /**
   * Express route handler for fetching stock price by symbol.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  app.get("/stock", checkStockPrice);

  app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
}
