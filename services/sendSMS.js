const API_KEY = 'b33eaf4f-979e-4d16-8157-3db5df121891';
const DEVICE_ID = '68c91767c27bd0d0b9680bd5';
const BASE_URL = 'https://api.textbee.dev/api/v1';

async function sendSMS(to, message) {
  try {
    const response = await fetch(`${BASE_URL}/gateway/devices/${DEVICE_ID}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        recipients: [formatPhoneNumber(to)],
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    console.log('✅ Poruka poslana:', data);
  } catch (err) {
    console.error('❌ Greška:', err.message);
  }
}

function formatPhoneNumber(rawNumber) {
  const number = rawNumber.replace(/\s+/g, '');

  if (number.startsWith('+')) return number;
  if (number.startsWith('00')) return '+' + number.slice(2);
  if (number.startsWith('0')) {
    const cleaned = number.slice(1);
    if (/^\d{8,9}$/.test(cleaned)) {
      return '+385' + cleaned;
    }
    throw new Error('Neispravan lokalni broj.');
  }
  throw new Error('Neispravan broj: očekivan +, 00, ili lokalni broj s 0.');
}

// Primjer
//sendSMS('0958138612', 'Vaša narudžba je prihvaćena!');

module.exports = { sendSMS };
