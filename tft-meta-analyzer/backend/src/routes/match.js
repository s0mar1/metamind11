const express = require('express');
const router = express.Router();
const riotApi = require('../services/riotApi');

router.get('/:matchId', async (req, res, next) => {
  try {
    const match = await riotApi.getMatchById(req.params.matchId);
    res.json(match);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
