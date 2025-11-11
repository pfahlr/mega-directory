const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const listings = []; // Placeholder: fetch from API or DB
  res.render('review', { listings });
});

module.exports = router;
