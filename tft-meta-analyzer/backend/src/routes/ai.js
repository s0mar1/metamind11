// backend/src/routes/ai.js
import express from 'express';
import axios from 'axios';
import { getMatchDetail } from '../services/riotApi.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DeckTier from '../models/DeckTier.js'; // DeckTier 모델 import

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

    // 2. AI에게 보낼 사용자 게임 데이터 및 다른 플레이어 데이터 가공하기
    const placement = userParticipant.placement;
    const goldLeft = userParticipant.gold_left !== undefined ? userParticipant.gold_left : '정보 없음';
    const totalDamageToPlayers = userParticipant.total_damage_to_players !== undefined ? userParticipant.total_damage_to_players : '정보 없음';
    const lastRound = userParticipant.last_round !== undefined ? userParticipant.last_round : '정보 없음';

    // 사용자 덱 정보 가공
    const userTraits = userParticipant.traits.filter(t => t.style > 0).map(t => {
        const traitInfo = tftData.traits.find(td => td.apiName.toLowerCase() === t.name.toLowerCase());
        return `${traitInfo ? traitInfo.name : t.name} (${t.tier_current})`;
    }).join(', ');
    const userUnits = userParticipant.units.map(u => {
        const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === u.character_id.toLowerCase());
        const itemNames = u.itemNames.map(itemName => {
            const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
            return itemInfo ? itemInfo.name : '';
        }).filter(Boolean);
        return `${champInfo ? champInfo.name : u.character_id} (${u.tier}성) [${itemNames.join(', ')}]`;
    }).join('\n');

    // 🚨🚨🚨 다른 7명의 플레이어 덱 정보 가공 🚨🚨🚨
    let otherParticipantsData = '';
    const otherParticipants = matchDetail.info.participants.filter(p => p.puuid !== userPuuid);
    if (otherParticipants.length > 0) {
        otherParticipantsData += "\n\n[다른 플레이어들의 최종 덱 정보]\n";
        otherParticipants.forEach((p, index) => {
            const pTraits = p.traits.filter(t => t.style > 0).map(t => {
                const traitInfo = tftData.traits.find(td => td.apiName.toLowerCase() === t.name.toLowerCase());
                return `${traitInfo ? traitInfo.name : t.name} (${t.tier_current})`;
            }).join(', ');
            const pUnits = p.units.map(u => {
                const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === u.character_id.toLowerCase());
                const itemNames = u.itemNames.map(itemName => {
                    const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
                    return itemInfo ? itemInfo.name : '';
                }).filter(Boolean);
                return `${champInfo ? champInfo.name : u.character_id} (${u.tier}성) [${itemNames.join(', ')}]`;
            }).join(', '); // 한 줄로 표시하기 위해 콤마로 연결

            otherParticipantsData += ` - 플레이어 ${p.placement}위: 활성화 특성: ${pTraits} / 유닛: ${pUnits}\n`;
        });
    }

    // 3. 메타 데이터(DeckTier)를 가져와 프롬프트에 추가
    const allMetaDecks = await DeckTier.find({ totalGames: { $gte: 3 } })
                                      .sort({ averagePlacement: 1 })
                                      .limit(10); // 상위 10개 덱 정보 제공 (프롬프트 길이 관리)

    let metaDataForAI = '';
    if (allMetaDecks.length > 0) {
      metaDataForAI += "\n\n[현재 챌린저 메타 주요 덱 정보 (MetaMind 분석 데이터)]\n";
      allMetaDecks.forEach((deck, index) => {
        const coreUnitsText = deck.coreUnits.map(cu => {
            const items = cu.recommendedItems?.map(item => item.name).filter(Boolean).join(', ') || '없음';
            return `${cu.name} (${cu.tier}성, ${cu.cost}코) [${items}]`;
        }).join('; ');

        metaDataForAI += `덱 ${index + 1}: ${deck.mainTraitName} ${deck.carryChampionName} (${deck.tierRank}티어, 평균 등수: ${deck.averagePlacement.toFixed(2)})\n`;
        metaDataForAI += `  - 주요 유닛 및 추천 아이템: ${coreUnitsText}\n`;
      });
      metaDataForAI += "\n※ 이 덱들은 현재 챌린저 유저들이 실제로 플레이하며 통계적으로 검증된 덱들입니다. 모든 덱은 잠재적으로 강력합니다.";
    }

    // 4. Gemini AI에게 보낼 프롬프트(질문) 생성
    const prompt = `
      당신은 **현역 롤토체스 챌린저이자 최고의 전략 분석가**입니다.
      MetaMind의 실시간 챌린저 통계 데이터를 기반으로 플레이어의 게임을 분석합니다.
      **플레이어의 게임 기록과 다른 플레이어들의 덱 정보를 면밀히 검토하고,
      [현재 챌린저 메타 주요 덱 정보]를 바탕으로 플레이어에게 가장 적합한 전략적 피드백을 제공해주세요.**
      모든 챌린저 덱은 기본적으로 강력하다는 전제 하에, 플레이어가 현재 메타에서 어떤 잠재력을 더 발휘할 수 있었는지에 집중합니다.

      당신의 피드백은 다음과 같은 특징을 가집니다:
      - **명확한 흐름:** 플레이어가 '이러이러한 아이템을 가지고 이러이러한 기물들을 선택했고, 그 기물들로 이러한 덱을 선택했다'는 흐름을 전제로 분석합니다. 만약 '이런 아이템을 보고 이런 기물과 덱을 선택했다면 좋은 판단이었지만, 이러한 대안도 있을 수 있었습니다'와 같이 유연하게 대안을 제시합니다.
      - **핵심 집중 & 간결함:** 너무 당연한 부분에 대한 설명은 줄여서 핵심적인 내용에 집중합니다.
      - **객관적 분석:** 게임을 직접 본 것이 아니므로, 데이터 기반의 사실과 통계적인 근거 내에서만 판단합니다. 무리한 추측성 답변은 위험하고 오류가 있을 수 있으므로 지양합니다. 불확실한 경우, 정보의 한계를 명확히 명시합니다.
      - **친근하지만 권위 있는 어조입니다:** 챌린저다운 자신감과 조언자의 태도를 유지하되, 플레이어를 격려하고 배우려는 의지를 북돋아줍니다.
      - **한국어로 답변합니다.**

      [사용자의 게임 기록]
      - 최종 등수: ${placement}등
      - 최종 라운드: ${lastRound}
      - 남은 골드: ${goldLeft}골드
      - 플레이어에게 가한 총 피해량: ${totalDamageToPlayers}
      - 활성화된 특성: ${userTraits}
      - 최종 배치 유닛 및 아이템:
      ${userUnits}

      ${otherParticipantsData} // 다른 플레이어 덱 정보 추가

      ${metaDataForAI}

      [분석 요청]
      1. 잘한 점 (Good Point): 이 플레이어의 덱 구성, 아이템 활용, 또는 운영 판단에서 칭찬할 만한 점을 1~2가지 **챌린저의 관점에서** 찾아주세요.
      2. 아쉬운 점 (Improvement Point): 더 높은 등수를 위해 개선할 수 있었던 점을 1~2가지 **구체적인 전략적 대안과 함께** 제안해주세요. 특히, **남은 골드, 총 피해량** 데이터를 참고하여 경제 운영이나 고점 운영에 대한 통찰력을 추가하고, **다른 플레이어들의 덱과의 상성**을 고려한 피드백도 포함해주세요.
    `;

    console.log("Gemini에게 분석을 요청합니다...");
    
    // 5. Gemini API 호출
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();

    console.log("Gemini로부터 분석 결과를 받았습니다.");

    // 6. AI 답변을 프론트엔드에 전달
    res.json({ analysis: aiResponseText });

  } catch(error) {
    console.error("AI 분석 중 에러 발생:", error);
    next(error);
  }
});

export default router;