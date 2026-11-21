import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { connectDB, isDbConnected } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'SonicBridge Acoustic Auth & Clan Engine',
    database: isDbConnected() ? 'MongoDB Connected' : 'Resilient In-Memory Mode (Zero Downtime)',
    timestamp: new Date().toISOString(),
  });
});

// Auto-connect to DB and start server when run directly
connectDB().then(() => {
  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`[SonicBridge Server] Running on http://localhost:${PORT}`);
      console.log(`[SonicBridge API] Auth endpoints ready at http://localhost:${PORT}/api/auth`);
    });
  }
});

export default app;
