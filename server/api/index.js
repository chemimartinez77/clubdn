// This file is a Vercel serverless function wrapper
// It imports the built Express app and exports it for Vercel

const app = require('../dist/index.js');

module.exports = app;
