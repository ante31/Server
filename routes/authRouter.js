const express = require('express');
const bcrypt = require('bcryptjs');
const { ref, get, update, remove, set } = require('firebase/database');
const database = require('../dbConnect'); // Ensure this connects to your Firebase Realtime Database

const authRouter = express.Router();

authRouter.post('/login/:pass', async (req, res) => {
  try {
    const { pass } = req.params;
    const reference = ref(database, 'General'); // Dohvaćamo cijeli General čvor
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      const { pass: storedPass, adminPass } = snapshot.val();

      // 1. Provjera za Admina
      if (adminPass && bcrypt.compareSync(pass, adminPass)) {
        console.log('Admin login successful');
        return res.status(200).json({ message: 'Login successful', role: 'admin' });
      }

      // 2. Provjera za običnog korisnika
      if (storedPass && bcrypt.compareSync(pass, storedPass)) {
        console.log('User login successful');
        return res.status(200).json({ message: 'Login successful', role: 'user' });
      }

      res.status(401).json({ error: 'Incorrect password' });
    } else {
      res.status(404).send('No passwords available in Firebase');
    }
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

module.exports = authRouter;
