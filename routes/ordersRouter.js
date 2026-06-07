const express = require('express');
const { ref, get, push, set } = require('firebase/database');
const database = require('../dbConnect');
const { updateOrderStatus } = require('../services/updateOrderStatus');
const { startAutoRejectTimer } = require('../services/autoRejectTimer');

const orderRouter = express.Router();

orderRouter.get('/', async (req, res) => {
  try {
    const reference = ref(database, 'Orders');
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).send('No data available in Firebase');
    }
  } catch (error) {
    console.error('Error fetching data from Firebase:', error);
    res.status(500).send('Failed to fetch data from Firebase');
  }
});

orderRouter.post('/', async (req, res) => {
  try {    
    console.log("NEW ORDER INCOMING");
    
    const { idempotencyKey, time: orderTime } = req.body;
    console.log("idempotencyKey:", idempotencyKey);
    const time = new Date(orderTime);
    time.setMinutes(time.getMinutes() + time.getTimezoneOffset()); 
    const year = time.getFullYear();
    const month = String(time.getMonth() + 1).padStart(2, '0');
    const day = String(time.getDate()).padStart(2, '0');

    const reference = ref(database, `Orders/${year}/${month}/${day}`);

    // 1. ZAŠTITA OD DUPLANJA: Ako postoji ključ, provjeri bazu za taj dan
    if (idempotencyKey) {
      const duplikatQuery = query(reference, orderByChild('idempotencyKey'), equalTo(idempotencyKey));
      const snapshot = await get(duplikatQuery);
      
      if (snapshot.exists()) {
        const postojeceNarudzbe = snapshot.val();
        const postojeciId = Object.keys(postojeceNarudzbe)[0];
        console.log(`Pronađena postojeća narudžba za ključ ${idempotencyKey}. Vraćam stari ID: ${postojeciId}`);
        
        res.status(200).set({ 'Content-Type': 'application/json' });
        return res.send(JSON.stringify({ id: postojeciId }));
      }
    }

    // 2. Ako ne postoji, generiraj novu narudžbu
    const newOrderRef = push(reference);
    await set(newOrderRef, req.body);

    // 3. Slanje odgovora natrag klijentu
    res.status(201).set({
      'Content-Type': 'application/json',
      'Connection': 'close' // 'close' je sigurniji za mobilni prvi zahtjev jer odmah javlja mobitelu da je gotovo
    });
    return res.send(JSON.stringify({ id: newOrderRef.key }));

  } catch (error) {
    console.error('Error creating order:', error);
    if (!res.headersSent) {
      return res.status(500).send('Failed to create order');
    }
  }
});

orderRouter.get('/:year/:month/:day/:orderId', async (req, res) => {
  try {
    const { year, month, day, orderId } = req.params;
    console.log(year, month, day, orderId );

    reference = ref(database, `Orders/${year}/${month}/${day}/${orderId}`);
    
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).send('No order found');
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).send('Failed to fetch order');
  }
});


orderRouter.get('/:year/:month/:day', async (req, res) => {
  try {
    const { year, month, day } = req.params;
    console.log(year, month, day);

    const reference = ref(database, `Orders/${year}/${month}/${day}`);
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      const orders = snapshot.val();

      res.json(orders);
    } else {
      res.status(404).send('No orders found for this date');
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Failed to fetch orders');
  }
});

orderRouter.patch("/:orderId", async (req, res) => {
  try {
    await updateOrderStatus({
      orderId: req.params.orderId,
      status: req.body.status,
      year: req.body.year,
      month: req.body.month,
      day: req.body.day,
    });

    res.status(200).send("OK");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = orderRouter;
