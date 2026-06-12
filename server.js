require('dotenv').config();
const express = require('express');
const generateHandler = require('./api/generate');

const app = express();
app.use(express.json());

app.post('/api/generate', generateHandler);

app.listen(3001, () => {
  console.log('API server running on http://localhost:3001');
});