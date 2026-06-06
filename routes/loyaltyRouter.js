const express = require('express');
const { ref, get, push, set, update } = require('firebase/database');
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

// POST /loyalty/:phone/create-coupon
loyaltyRouter.post("/:phone/create-coupon", async (req, res) => {
  try {
    const { phone } = req.params;

    console.log(`Creating coupon for phone: ${phone}`);

    // reference do korisnika u loyalty
    const loyaltyRef = ref(database, `Loyalty/${phone}`);
    const snapshot = await get(loyaltyRef);

    console.log("Loyalty snapshot:", snapshot.val());

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const data = snapshot.val();
    console.log("Loyalty data:", data);
    const points = data.loyalty_points || 0;
    const awardsWon = data.awards_won || 0;

    // threshold iz /general/awardThreshold
    const thresholdRef = ref(database, "general/awardThreshold");
    const thresholdSnap = await get(thresholdRef);
    const THRESHOLD = thresholdSnap.exists() ? thresholdSnap.val() : 500;

    if (points < THRESHOLD) {
      console.log(`Not enough points: ${points} (threshold: ${THRESHOLD})`);
      return res.status(400).json({
        error: "Not enough loyalty points",
        points,
      });
    }

    // kreiraj coupon
    const couponsRef = ref(database, `Loyalty/${phone}/coupons`);
    const couponRef = push(couponsRef);

    const coupon = {
      value: 10,           // trenutno fiksno 10€
      isUsed: false,
      createdAt: new Date().toISOString(),
    };

    await set(couponRef, coupon);

    // update loyalty korisnika
    await update(loyaltyRef, {
      loyalty_points: points - THRESHOLD,
      awards_won: awardsWon + 1,
    });

    res.status(201).json({
      success: true,
      couponId: couponRef.key,
      remaining_points: points - THRESHOLD,
      new_awards_won: awardsWon + 1,
    });

  } catch (error) {
    console.error("Create coupon error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

loyaltyRouter.patch('/:phone/coupons/:couponId', async (req, res) => {
  try {
    const { phone, couponId } = req.params;
    const { isUsed, usedAt } = req.body; 

    console.log(req.body);

    console.log(`Updating coupon ${couponId} for user ${phone} to isUsed: ${isUsed} on ${usedAt}`);

    const reference = ref(database, `Loyalty/${phone}/coupons/${couponId}`);

    const snapshot = await get(reference);
    
    if (!snapshot.exists()) {
      return res.status(404).send('Coupon not found');
    }

    // Ažuriranje polja isUsed i dodavanje timestampa
    await update(reference, { 
      isUsed: isUsed,
      usedAt: usedAt || Date.now() 
    });

    res.status(200).send(`Coupon ${couponId} successfully updated.`);
  } catch (error) {
    console.error('Error updating coupon status:', error);
    res.status(500).send('Failed to update coupon status');
  }
});

// routes/loyaltyRouter.js
loyaltyRouter.get("/:phone/coupons", async (req, res) => {
  try {
    const { phone } = req.params;

    const couponsRef = ref(database, `Loyalty/${phone}/coupons`);
    const snapshot = await get(couponsRef);

    if (!snapshot.exists()) {
      return res.json([]);
    }

    const couponsObj = snapshot.val();

    const coupons = Object.entries(couponsObj)
      .filter(([_, coupon]) => coupon.isUsed === false)
      .map(([id, coupon]) => ({
        id,
        value: coupon.value,
        createdAt: coupon.createdAt
      }));

    res.json(coupons);

  } catch (error) {
    console.error("Fetch coupons error:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

module.exports = loyaltyRouter;