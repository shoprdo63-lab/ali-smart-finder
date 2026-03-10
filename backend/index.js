require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AliExpress Price Finder Backend is running' });
});

const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

apiRouter.post('/search', async (req, res) => {
  try {
    const { productTitle, category } = req.body;
    
    if (!productTitle) {
      return res.status(400).json({ error: 'Product title is required' });
    }

    res.json({
      success: true,
      message: 'Search endpoint ready',
      query: productTitle,
      category: category || 'gaming'
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
