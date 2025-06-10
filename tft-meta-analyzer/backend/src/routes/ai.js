import express from 'express';
import axios from 'axios';
import { getMatchDetail } from '../services/riotApi.js';
// ⬇️⬇️⬇️ Google AI 라이브러리를 import 합니다. ⬇️⬇️⬇️
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// --- Google AI 설정 ---
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!GOOGLE_AI_API_KEY) {
  console.error('GOOGLE_AI_API_KEY가 .env 파일에 없습니다!');
}
const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });


// --- 데이터 드래곤 로딩 로직 (변경 없음) ---
let tftData = null;
const TFT_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json';
async function loadTFTData() { 
  if (tftData) return;
  try { 
    console.log('(AI Route) 최신 TFT 데이터를 불러오는 중입니다...'); 
    const response = await axios.get(TFT_DATA_URL); 
    const currentSet = '14'; 
    tftData = { 
      items: response.data.items, 
      champions: response.data.sets[currentSet].champions, 
      traits: response.data.sets[currentSet].traits, 
    };
    console.log(`(AI Route) TFT 시즌 ${currentSet} 데이터 로딩 성공!`); 
  } catch (error) { 
    console.error('(AI Route) TFT 데이터 로딩 실패:', error.message); 
  } 
}
loadTFTData();


// POST /api/ai/analyze
router.post('/analyze', async (req, res, next) => {
  const { matchId, userPuuid } = req.body;
  if (!matchId || !userPuuid) { return res.status(400).json({ error: 'matchId와 userPuuid가 필요합니다.' }); }

  try {
    // 1. 매치 상세 정보 및 사용자 정보 가져오기
    const matchDetail = await getMatchDetail(matchId);
    const userParticipant = matchDetail.info.participants.find(p => p.puuid === userPuuid);
    if (!userParticipant) { return res.status(404).json({ error: '해당 게임에서 사용자를 찾을 수 없습니다.' }); }

    // 2. AI에게 보낼 데이터 가공하기
    const placement = userParticipant.placement;
    const traits = userParticipant.traits.filter(t => t.style > 0).map(t => {
        const traitInfo = tftData.traits.find(td => td.apiName.toLowerCase() === t.name.toLowerCase());
        return `${traitInfo ? traitInfo.name : t.name} (${t.tier_current})`;
    }).join(', ');
    const units = userParticipant.units.map(u => {
        const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === u.character_id.toLowerCase());
        const itemNames = u.itemNames.map(itemName => {
            const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
            return itemInfo ? itemInfo.name : '';
        }).filter(Boolean);
        return `${champInfo ? champInfo.name : u.character_id} (${u.tier}성) [${itemNames.join(', ')}]`;
    }).join('\n');

    // 3. Gemini AI에게 보낼 프롬프트(질문) 생성
    const prompt = `
      당신은 세계 최고의 TFT(롤토체스) 전략 분석가입니다. 아래 주어진 게임 기록을 보고, 플레이어의 플레이를 날카롭게 분석하고 개선점을 제안해주세요. 긍정적인 점과 아쉬운 점을 나누어, 친절하지만 전문적인 톤으로 설명해주세요.

      [게임 기록]
      - 최종 등수: ${placement}등
      - 활성화된 특성: ${traits}
      - 최종 배치 유닛 및 아이템:
      ${units}

      [분석 요청]
      1. 잘한 점 (Good Point): 이 플레이어의 덱 구성이나 아이템 활용에서 칭찬할 만한 점을 1~2가지 찾아주세요.
      2. 아쉬운 점 (Improvement Point): 더 높은 등수를 위해 개선할 수 있었던 점을 1~2가지 구체적으로 제안해주세요. (예: 아이템 조합, 유닛 배치, 특정 유닛 기용 등)
    `;

    console.log("Gemini에게 분석을 요청합니다...");
    
    // 4. Gemini API 호출
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();

    console.log("Gemini로부터 분석 결과를 받았습니다.");

    // 5. AI 답변을 프론트엔드에 전달
    res.json({ analysis: aiResponseText });

  } catch(error) {
    // Gemini API 에러 또는 다른 에러 처리
    console.error("AI 분석 중 에러 발생:", error);
    next(error);
  }
});

export default router;