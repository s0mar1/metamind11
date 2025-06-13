// backend/src/routes/summoner.js
import express from 'express';
import getTftData from '../services/tftData.js';
import axios from 'axios';

const router = express.Router();

// 사용자 지정 오류 클래스
class APIError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
    }
}

// 플랫폼 지역을 Account API 및 Match API의 지역 라우팅 값으로 매핑하는 함수
const getRegionalApiRoute = (platformRegion) => {
    switch (platformRegion.toLowerCase()) {
        case 'kr':
        case 'jp1':
        case 'oc1':
        case 'ph2':
        case 'sg2':
        case 'th2':
        case 'tw2':
        case 'vn2':
            return 'asia';
        case 'na1':
        case 'br1':
        case 'la1':
        case 'la2':
            return 'americas';
        case 'euw1':
        case 'eun1':
        case 'tr1':
        case 'ru':
        case 'me1':
            return 'europe';
        case 'pbe':
            return 'americas'; // PBE는 현재 americas 라우팅을 따릅니다.
        default:
            console.warn(`WARN: Unknown platform region: ${platformRegion}. Defaulting to 'asia' for Regional API.`);
            return 'asia';
    }
};


// GET /api/summoner?region=kr&gameName=...&tagLine=...
router.get('/', async (req, res, next) => {
    const { region, gameName, tagLine } = req.query; // region은 'kr', 'na1' 같은 게임 서버 지역

    if (!region || !gameName || !tagLine) {
        return res.status(400).json({ message: 'Region, gameName, and tagLine are required.' });
    }

    try {
        const apiKey = process.env.RIOT_API_KEY;

        if (!apiKey) {
            console.error('ERROR: RIOT_API_KEY is not set in environment variables. Please check your .env file and server startup.');
            return res.status(500).json({ message: 'Server configuration error: Riot API key missing.' });
        } else {
            // API 키가 로드되었는지 확인하는 DEBUG 로그는 유지
            console.log(`DEBUG: RIOT_API_KEY is loaded. (Length: ${apiKey.length}, Starts with: ${apiKey.substring(0, 5)})`);
        }

        // Account API 및 Match API 호출을 위한 올바른 지역 라우팅 값 생성
        const regionalApiRoute = getRegionalApiRoute(region); 

        // 1. puuid 가져오기 (계정 정보) - 지역 라우팅 사용
        const accountUrl = `https://${regionalApiRoute}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`;
        console.log(`INFO: Fetching puuid from: ${accountUrl}`);
        const accountResponse = await axios.get(accountUrl);
        const puuid = accountResponse.data.puuid;
        console.log(`INFO: Successfully fetched puuid: ${puuid}`);

        // 2. 매치 ID 목록 가져오기 (최신 10개) - 지역 라우팅 사용
        const matchesUrl = `https://${regionalApiRoute}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=10&api_key=${apiKey}`; // count=10 유지
        console.log(`INFO: Fetching match IDs from: ${matchesUrl}`);
        const matchIdsResponse = await axios.get(matchesUrl);
        const matchIds = matchIdsResponse.data;
        console.log(`INFO: Successfully fetched ${matchIds.length} match IDs.`);


        // 3. 각 매치 상세 정보 가져오기 - 지역 라우팅 사용 (요청 지연 추가)
        console.log(`INFO: Starting to fetch details for ${matchIds.length} matches with delay.`);
        
        const fetchMatchDetailsWithDelay = async () => {
            const details = [];
            for (let i = 0; i < matchIds.length; i++) {
                const matchId = matchIds[i];
                const detailUrl = `https://${regionalApiRoute}.api.riotgames.com/tft/match/v1/matches/${matchId}?api_key=${apiKey}`;
                // console.log(`DEBUG: Fetching match detail ${i + 1}/${matchIds.length} from: ${detailUrl}`); // 상세 로그 제거
                try {
                    const response = await axios.get(detailUrl);
                    // console.log(`DEBUG: Successfully fetched detail for match ${matchId} (index ${i + 1}).`); // 상세 로그 제거
                    details.push(response.data);
                } catch (detailError) {
                    console.error(`ERROR: Failed to fetch detail for match ${matchId} (index ${i + 1}): ${detailError.message}. Status: ${detailError.response?.status || 'No status'}`);
                    throw detailError; 
                }
                await new Promise(resolve => setTimeout(resolve, 150)); 
            }
            return details;
        };

        const matchDetails = await fetchMatchDetailsWithDelay();
        console.log(`INFO: Successfully fetched details for all ${matchDetails.length} matches.`);

        // TFT Data Dragon 데이터 로드
        const tftData = await getTftData();
        
        if (!tftData) {
            return res.status(500).json({ message: 'Failed to load TFT Data Dragon data from backend service.' });
        }

        const processedMatches = matchDetails.map(match => {
            const participant = match.info.participants.find(p => p.puuid === puuid);
            if (!participant) return null;

            const cdnBaseUrl = 'https://raw.communitydragon.org/latest/game/';

            const units = participant.units.map(unit => {
                const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === unit.character_id.toLowerCase());
                const items = unit.itemNames.map(itemName => {
                    const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
                    const itemImageUrl = itemInfo?.icon ? `${cdnBaseUrl}${itemInfo.icon.toLowerCase().replace('.tex', '.png')}` : null;
                    // console.log(`DEBUG: Processing item: ${itemName}`); // 상세 로그 제거
                    return { name: itemInfo?.name || '', image_url: itemImageUrl };
                });
                const champImageUrl = champInfo?.tileIcon ? `${cdnBaseUrl}${champInfo.tileIcon.toLowerCase().replace('.tex', '.png')}` : null;
                // console.log(`DEBUG: Processing unit: ${unit.character_id}`); // 상세 로그 제거
                return {
                    name: champInfo?.name || '', 
                    image_url: champImageUrl,
                    tier: unit.tier, 
                    cost: champInfo?.cost || 0, 
                    items: items,
                };
            });

            const traits = participant.traits.filter(t => t.style > 0).map(t => {
                const traitInfo = tftData.traits.find(trait => trait.apiName.toLowerCase() === t.name.toLowerCase());
                let traitImageUrl = null;
                let traitGradeName = '';

                if (traitInfo?.icon) {
                    const gradeSuffixMap = {
                        1: 'bronze', 2: 'silver', 3: 'gold', 4: 'chromatic'
                    };
                    const gradeName = gradeSuffixMap[t.style] || 'bronze';

                    const baseIconPath = traitInfo.icon.toLowerCase().replace('.tex', '');
                    traitImageUrl = `${cdnBaseUrl}${baseIconPath}_${gradeName}.png`;
                    traitGradeName = gradeName;
                } else {
                    traitImageUrl = null;
                }
                // console.log(`DEBUG: Processing trait: ${t.name}`); // 상세 로그 제거
                return {
                    name: traitInfo ? traitInfo.name : t.name, 
                    apiName: t.name, 
                    image_url: traitImageUrl, 
                    tier_current: t.tier_current, 
                    style: t.style,
                    gradeName: traitGradeName,
                };
            });

            return {
                matchId: match.metadata.match_id, 
                game_datetime: match.info.game_datetime, 
                placement: participant.placement, 
                last_round: participant.last_round, 
                units, 
                traits, 
                level: participant.level,
                queue_id: match.info.queue_id // queue_id를 반환 객체에 추가
            };
        }).filter(Boolean);

        // NOTE: account와 league 정보는 Riot API에서 직접 가져와야 합니다.
        // 현재는 임시 데이터로 ProfileCard에서 오류가 나지 않도록 최소한의 값을 제공합니다.
        // 실제 구현에서는 Account-v1 API (puuid 가져올 때 받은 응답 활용)와
        // TFT-League-v1 API 호출을 추가하여 이 정보를 채워야 합니다.
        res.json({
            account: { 
                gameName: gameName,
                tagLine: tagLine,
                puuid: puuid,
                profileIconId: 29 // 예시 값. 실제 프로필 아이콘 ID는 Account API에서 가져와야 함.
            },
            league: null, // League-v1 API에서 가져와야 함. 현재는 null 또는 빈 객체.
            matches: processedMatches 
        });

    } catch (error) {
        console.error('ERROR: Error fetching summoner data:', error.message);
        console.error('ERROR Details:', error.response?.data || error);

        if (error.response) {
            if (error.response.status === 404) {
                return res.status(404).json({ message: 'Riot ID not found or no recent TFT matches for this PUUID.' });
            }
            if (error.response.status === 403) {
                return res.status(403).json({ message: 'Riot API Forbidden: Check API key validity and correct API routing.' });
            }
            if (error.response.status === 429) {
                 return res.status(429).json({ message: 'Riot API rate limit exceeded. Please try again shortly.' });
            }
            return res.status(error.response.status).json({ message: error.response.data?.status?.message || 'An unhandled error occurred with the Riot API.' });
        } else if (error instanceof APIError) {
            return res.status(error.statusCode).json({ message: error.message });
        } else {
            return res.status(500).json({ message: 'An unexpected server error occurred on the backend.' });
        }
    }
});

export default router;