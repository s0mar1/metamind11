import express from 'express';
import { getSummonerData } from '../controllers/summonerController.js';
const router = express.Router();
router.get('/:region/:rawName', getSummonerData); // 로직을 컨트롤러 함수로 대체
export default router;