const express = require('express');
const { ref, get, update } = require('firebase/database');
const database = require('../dbConnect');

const generalRouter = express.Router();

generalRouter.get('/', async (req, res) => {
  try {
    const reference = ref(database, 'General');
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).send('No general available in Firebase');
    }
  } catch (error) {
    res.status(500).send('Failed to fetch general from Firebase');
  }
});

generalRouter.patch('/', async (req, res) => {
  try {
    const updates = req.body;
    console.log("updates", updates);
    
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).send('Invalid update data provided');
    }

    const reference = ref(database, 'General');
    const snapshot = await get(reference);

    if (!snapshot.exists()) {
      return res.status(404).send('General settings not found');
    }

    // Merge updates with existing data (partial update)
    const currentData = snapshot.val();
    const updatedData = { ...currentData, ...updates };

    // Save merged data
    await update(reference, updatedData);
    
    res.status(200).json(updatedData); // Return the full updated object
  } catch (error) {
    console.error('Error updating general:', error);
    res.status(500).send('Failed to update general settings');
  }
});

module.exports = generalRouter;
