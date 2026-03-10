import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import searchRouter from './routes/search.js';
import matchRouter from './routes/match.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', searchRouter);
app.use('/api', matchRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'TechOffice Price Hunter API' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 TechOffice Price Hunter API running on http://localhost:${PORT}`);
});

export default app;
