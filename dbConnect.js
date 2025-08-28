const { initializeApp, getApps } = require('firebase/app');
const { getDatabase } = require('firebase/database');
require('dotenv').config();

const isTest = true;

const firebaseConfig = isTest
  ? {
      apiKey: process.env.TEST_FIREBASE_API_KEY,
      authDomain: process.env.TEST_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.TEST_FIREBASE_DATABASE_URL,
      projectId: process.env.TEST_FIREBASE_PROJECT_ID,
      storageBucket: process.env.TEST_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.TEST_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.TEST_FIREBASE_APP_ID,
      measurementId: process.env.TEST_FIREBASE_MEASUREMENT_ID,
    }
  : {
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
