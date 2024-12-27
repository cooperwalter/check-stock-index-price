# Stock Price Checker

## Overview

This is a simple server that checks the price of a stock and stores the price in a Firestore database.

Stack:

- [Google Cloud Run Functions](https://cloud.google.com/functions?hl=en) to execute the program as a serverless function
- [Google Firestore](https://cloud.google.com/firestore) to store the stock prices
- [Cloud Scheduler](https://cloud.google.com/scheduler) to schedule the function to run at a regular interval
- [Finnhub API](https://finnhub.io/docs/api/introduction) to get the stock prices
- [Node.js](https://nodejs.org/en) to run the program
- [IFTTT](https://ifttt.com) to send a notification when the price drops

Cloud Run Functions runs our program as a serverless function. It is triggered by a Cloud Scheduler job that calls the function using an HTTP request. If the price has dropped by more than the threshold, we trigger an IFTTT webhook to send a notification.

## Setup

```bash
npm install
```

You must also define these variables in a `.env` file in the root of the project (see .env.debug for an example):

- `PORT` - The port to run the server on
- `FINNHUB_API_KEY` - The API key for the Finnhub API
- `FIRESTORE_PROJECT_ID` - The ID of the Firestore project
- `FIRESTORE_DATABASE` - The name of the Firestore database
- `FIRESTORE_COLLECTION` - The name of the Firestore collection
- `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` - The path to the Firebase service account key file
- `NOTIFIER_WEBHOOK_ENDPOINT` - The endpoint for the IFTTT webhook
- `PRICE_DROP_THRESHOLD_PERCENTAGE` - The percentage drop threshold for the price
- `ENVIRONMENT` - (Dev Only) Set to "dev" to run a local express server instead of a Cloud Run Functions endpoint

## Connect to Google Cloud Run Functions

1. Install the Google Cloud Code extension for VSCode
2. Click the Google Cloud Code status bar icon to login
3. Select the project `stock-price-checker`
4. In the Cloud Code sidebar, click "Cloud Functions"
5. Then click "Click here to set up your current workspace for Cloud Functions"
6. Then press enter to accept the default settings

## Deploying To Google Cloud Run

Honestly, copying and pasting the files into the Google Cloud Run Functions editor is the easiest way to deploy. Only the editor supports testing the function... so yeah.

Files that need to be deployed:

- `index.js` - The main entry point for the function
- `Firestore.js` - The Firestore service
- `Notifier.js` - The notifier service
- `package.json` - The package.json file

## Google Firestore Storage

Google Firestore is a NoSQL database that uses collections and documents to store data.

### Firestore Setup

You must have a Firestore database named "stock-prices" and a collection named "prices".

### Firestore Environment Variables

You must create a `.env` file in the root of the project with the following variables (see .env.debug for an example)

- `FIRESTORE_PROJECT_ID` - The ID of the Firestore project
- `FIRESTORE_DATABASE` - The name of the Firestore database
- `FIRESTORE_COLLECTION` - The name of the Firestore collection
- `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` - (Dev Only) The path to the Firebase service account key file (required for local development because the Cloud Run Function will already have access to the Firestore database)
