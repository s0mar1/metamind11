import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import summonerRoutes from './routes/summoner.js';
import matchRoutes from './routes/match.js';
import aiRoutes from './routes/ai.js'; // ⬅️ 추가된 부분
import errorHandler from './middlewares/errorHandler.js';
import './services/scheduler.js';
import connectDB from './config/db.js';
import tierlistRoutes from './routes/tierlist.js';
import rankingRoutes from './routes/ranking.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
connectDB();

app.use(cors());
app.use(express.json());

// API 라우터
app.use('/api/summoner', summonerRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/ai', aiRoutes); // ⬅️ 추가된 부분
app.use('/api/tierlist', tierlistRoutes);
app.use('/api/deck-tiers', tierlistRoutes); 
app.use('/api/ranking', rankingRoutes);

app.get('/', (req, res) => {
  res.send('TFT Meta Analyzer Backend is running!');
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Riot API Key Loaded: ${!!process.env.RIOT_API_KEY}`);
});