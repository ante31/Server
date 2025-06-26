const express = require('express');

const qrRedirecter = express.Router();

qrRedirecter.get('/', (req, res) => {
  const userAgent = req.headers['user-agent'].toLowerCase();

  // Check for Android
  if (userAgent.includes('android')) {
    return res.redirect('https://play.google.com/store/apps/details?id=com.ante3101.Gricko');
  }

  // Check for iPhone, iPad, or iPod (iOS devices)
  if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
    return res.redirect('https://apps.apple.com/app/id6745101950');
  }

  // Optional: fallback if not mobile
  res.send('Unsupported device. Please visit from a mobile device.');
});

module.exports = qrRedirecter;