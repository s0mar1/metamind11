const { CronJob } = require('cron');
const riotApi = require('../services/riotApi');
const Summoner = require('../models/Summoner');
const Match = require('../models/Match');

async function collectMatches() {
  try {
    const summoners = await Summoner.find();
    for (const summ of summoners) {
      const ids = await riotApi.getMatchIdsByPuuid(summ.puuid, 20);
      for (const id of ids) {
        const exists = await Match.exists({ matchId: id });
        if (!exists) {
          const data = await riotApi.getMatchById(id);
          await Match.create({
            matchId: id,
            participants: data.info.participants,
            gameDuration: data.info.gameDuration,
            metadata: data.metadata
          });
        }
      }
    }
    console.log('Match collection complete');
  } catch (err) {
    console.error('Error collecting matches:', err);
  }
}

new CronJob('0 */30 * * * *', collectMatches, null, true, 'Asia/Seoul');
