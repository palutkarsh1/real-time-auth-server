// Vercel Serverless Function Entry Point
// This file wraps the Express app for Vercel deployment

// Set Vercel environment flag before requiring index.js
const app = require('../index');

// Export the Express app as a serverless function
// Vercel will handle the request/response
module.exports = app;
