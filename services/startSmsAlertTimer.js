const { ref, get } = require("firebase/database");
const database = require("../dbConnect");
const { sendSMS } = require("./sendSMS");

const SMS_ALERT_TIME = 4 * 60 * 1000; // 4 minute

const ALERT_PHONE = "0958138612";
const ALERT_MESSAGE = "Narudžba čeka prihvaćanje.";

// Imena dana kako su keyani u /General/Worktime (getDay(): 0 = nedjelja)
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getOrder = async (orderId, year, month, day) => {
  const orderRef = ref(database, `Orders/${year}/${month}/${day}/${orderId}`);
  const snapshot = await get(orderRef);

  if (!snapshot.exists()) return null;
  return snapshot.val();
};

// Dohvati radno vrijeme za konkretan dan iz baze.
// Vraća { openingTime, closingTime } ili null ako ne postoji.
const getWorktimeForDay = async (year, month, day) => {
  const dayName = WEEKDAYS[new Date(Number(year), Number(month) - 1, Number(day)).getDay()];

  const worktimeRef = ref(database, `General/workTime/${dayName}`);
  const snapshot = await get(worktimeRef);

  if (!snapshot.exists()) return null;

  const wt = snapshot.val();

  if (!wt || !wt.openingTime || !wt.closingTime) return null;

  return { openingTime: wt.openingTime, closingTime: wt.closingTime };
};

// Pretvori "HH:MM" u epoch ms za konkretni dan (month je 1-based).
const timeStringToDate = (timeStr, year, month, day) => {
  const [h, m] = timeStr.split(":").map(Number);
  return new Date(Number(year), Number(month) - 1, Number(day), h, m, 0, 0).getTime();
};

const startSmsAlertTimer = async (orderId, year, month, day) => {
  const now = Date.now();

  const worktime = await getWorktimeForDay(year, month, day);

  if (!worktime) {
    console.log(`SMS alert skipped for order ${orderId}: nema radnog vremena za taj dan`);
    return;
  }

  const openMs = timeStringToDate(worktime.openingTime, year, month, day);
  const closeMs = timeStringToDate(worktime.closingTime, year, month, day);

  // Odbrojavanje 4 min vrijedi tek unutar radnog vremena.
  // Ako je naručeno prije otvaranja (narudžba unaprijed), počni brojati od otvaranja.
  const countStart = Math.max(now, openMs);

  // Ako je već nakon zatvaranja, preskoči alert.
  if (countStart > closeMs) {
    console.log(`SMS alert skipped for order ${orderId}: izvan radnog vremena`);
    return;
  }

  const fireAt = countStart + SMS_ALERT_TIME;

  // Ako bi rok pao nakon zatvaranja, preskoči alert.
  if (fireAt > closeMs) {
    console.log(`SMS alert skipped for order ${orderId}: rok pada nakon zatvaranja`);
    return;
  }

  const delay = fireAt - now; // može biti veći od 4 min ako je narudžba unaprijed

  setTimeout(async () => {
    try {
      const order = await getOrder(orderId, year, month, day);

      if (!order) return;

      if (order.status === "pending") {
        console.log(`Sending SMS alert for pending order ${orderId}`);
        await sendSMS(ALERT_PHONE, ALERT_MESSAGE);
      }
      else {
        console.log(`Not sending SMS alert for order ${orderId} as it is not pending`);
      }
    } catch (err) {
      console.error("SMS alert error:", err);
    }
  }, delay);
};

module.exports = { startSmsAlertTimer };
