process.env.TZ = 'Asia/Kolkata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db';

dotenv.config();

import instrumentsRouter from './routes/instruments';
import calendarRouter from './routes/calendar';
import searchRouter from './routes/search';
import apiRoutes from './routes/api';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);
app.use('/api/instruments', instrumentsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/search', searchRouter);

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
