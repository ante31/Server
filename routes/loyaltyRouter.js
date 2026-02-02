const express = require('express');
const { ref, get } = require('firebase/database');
const database = require('../dbConnect');

const loyaltyRouter = express.Router();

loyaltyRouter.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return res.status(400).send('Missing phone number');
    }

    // Referenca na lokaciju bodova
    const loyaltyRef = ref(database, `Loyalty/${phone}`);
    
    // Čitanje podataka
    const snapshot = await get(loyaltyRef); 

    if (snapshot.exists()) {
      res.status(200).json(snapshot.val()); 
    } else {
      // Korisnik ne postoji (vraća se 404, frontend će ovo tretirati kao 0 bodova)
      res.status(404).json({ points: 0, awards: 0 }); 
    }
  } catch (error) {
    console.error('Error fetching loyalty data:', error);
    res.status(500).send('Failed to fetch loyalty data');
  }
});

module.exports = loyaltyRouter;