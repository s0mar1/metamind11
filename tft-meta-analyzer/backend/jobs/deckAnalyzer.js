// backend/jobs/deckAnalyzer.js

// 💡 에러 수정: ../src/ 경로를 정확히 명시하여 모델과 서비스를 가져옵니다.
import Match from '../src/models/Match.js';
import DeckTier from '../src/models/DeckTier.js';
import getTFTData from '../src/services/tftData.js';

const calculateTierRank = (averagePlacement, top4Rate) => {
    if (averagePlacement <= 4.15 && top4Rate >= 0.58) return { rank: 'S', order: 1 };
    if (averagePlacement <= 4.35 && top4Rate >= 0.53) return { rank: 'A', order: 2 };
    if (averagePlacement <= 4.55 && top4Rate >= 0.50) return { rank: 'B', order: 3 };
    if (averagePlacement <= 4.75 && top4Rate >= 0.45) return { rank: 'C', order: 4 };
    return { rank: 'D', order: 5 };
};

export const analyzeAndCacheDeckTiers = async () => {
    console.log('--- [최종] 덱 티어리스트 분석 작업 시작 ---');
    try {
        const tftData = await getTFTData();
        if (!tftData) {
            console.error('TFT 데이터를 불러오지 못해 덱 분석을 중단합니다.');
            return;
        }

        const allItems = Object.values(tftData.items).flat();
        const allMatches = await Match.find({});
        const deckDataAggregator = {};
        console.log(`총 ${allMatches.length}개의 매치를 분석합니다.`);

        allMatches.forEach(match => {
            if (!match?.info?.participants) return;

            match.info.participants.forEach(p => {
                if (!p?.units || !p?.traits) return;

                const findChampInfo = id => tftData.champions.find(c => c.apiName && id && c.apiName.toLowerCase() === id.toLowerCase());

                const enrichedUnits = p.units.map(u => ({ ...u, cost: findChampInfo(u.character_id)?.cost || 0 }));

                let carryUnit =
                    enrichedUnits.find(u => u.tier === 3 && u.itemNames?.length >= 2) ||
                    enrichedUnits.find(u => ((u.cost === 4 || u.cost === 5) && u.tier >= 2 && u.itemNames?.length >= 2)) ||
                    [...enrichedUnits].sort((a, b) => (b.itemNames?.length || 0) - (a.itemNames?.length || 0))[0];

                if (!carryUnit || !carryUnit.character_id) return;
                const carryInfo = findChampInfo(carryUnit.character_id);
                if (!carryInfo) return;

                const traits = p.traits
                    .map(t => {
                        // 💡 안정성 강화: t.name이 없을 경우를 대비합니다.
                        if (!t.name) return null;
                        const traitInfo = tftData.traitMap.get(t.name.toLowerCase());
                        return traitInfo ? { ...t, name: traitInfo.name } : null;
                    })
                    .filter(Boolean);

                if (!traits.length) return;

                const mainTrait = [...traits].sort((a, b) => (b.style || 0) - (a.style || 0))[0];
                if (!mainTrait) return;
                const deckKey = `${mainTrait.name} ${carryInfo.name}`;

                if (!deckDataAggregator[deckKey]) {
                    deckDataAggregator[deckKey] = {
                        mainTraitName: mainTrait.name,
                        carryChampionName: carryInfo.name,
                        placements: [],
                        unitOccurrences: {},
                    };
                }
                const agg = deckDataAggregator[deckKey];
                agg.placements.push(p.placement);

                enrichedUnits.forEach(u => {
                    if (!u.character_id) return;
                    if (!agg.unitOccurrences[u.character_id]) {
                        agg.unitOccurrences[u.character_id] = { count: 0, items: [], cost: u.cost, tier: u.tier };
                    }
                    const entry = agg.unitOccurrences[u.character_id];
                    entry.count++;
                    if (u.itemNames) entry.items.push(...u.itemNames);
                });
            });
        });

        console.log(`[최종] 분석 완료. ${Object.keys(deckDataAggregator).length}개 덱 발견.`);

        for (const key in deckDataAggregator) {
            const d = deckDataAggregator[key];
            const totalGames = d.placements.length;
            if (totalGames < 3) continue;

            const coreUnits = Object.entries(d.unitOccurrences)
                .sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([apiName, u]) => {
                    const champInfo = tftData.champions.find(c => c.apiName && apiName && c.apiName.toLowerCase() === apiName.toLowerCase());
                    const itemCounts = u.items.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});

                    const recommendedItems = Object.entries(itemCounts)
                        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([itemApi]) => {
                            const it = allItems.find(i => i.apiName && itemApi && i.apiName.toLowerCase() === itemApi.toLowerCase());
                            return { name: it?.name || '', image_url: it?.icon || null };
                        });

                    return {
                        name: champInfo?.name || 'Unknown',
                        apiName: champInfo?.apiName,
                        image_url: champInfo?.tileIcon,
                        cost: u.cost,
                        tier: u.tier,
                        recommendedItems,
                    };
                });

            const avg = d.placements.reduce((s, p) => s + p, 0) / totalGames;
            const top4 = d.placements.filter(p => p <= 4).length / totalGames;
            const tier = calculateTierRank(avg, top4);

            await DeckTier.findOneAndUpdate(
                { deckKey: key },
                {
                    mainTraitName: d.mainTraitName,
                    carryChampionName: d.carryChampionName,
                    coreUnits,
                    totalGames,
                    top4Count: d.placements.filter(p => p <= 4).length,
                    winCount: d.placements.filter(p => p === 1).length,
                    averagePlacement: avg,
                    tierRank: tier.rank,
                    tierOrder: tier.order,
                },
                { upsert: true },
            );
        }
        console.log('--- [최종] 덱 티어리스트 통계 계산 및 DB 저장 완료 ---');
    } catch (err) {
        console.error('[최종] 덱 티어리스트 분석 중 에러:', err.message, err.stack);
    }
};