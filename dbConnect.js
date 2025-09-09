const { initializeApp, getApps } = require('firebase/app');
const { getDatabase } = require('firebase/database');
require('dotenv').config();

const isTest = true;

const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    };

// Inicijalizacija Firebase (sprječava duplo inicijaliziranje u nekim okruženjima)
const appFirebase = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(appFirebase);

module.exports = database;
