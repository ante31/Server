const {
  ref,
  get,
  update,
  push,
  set,
  runTransaction,
} = require("firebase/database");

const database = require("../dbConnect");
const { sendPushNotification } = require("./sendPushNotification");
const { sendSMS } = require("./sendSMS");

const updateOrderStatus = async ({
  orderId,
  status,
  year,
  month,
  day,
}) => {
  try {
    console.log(`Updating order ${orderId} status to ${status}`);
    console.log(year, month, day);

    if (!status || (status !== 'accepted' && status !== 'rejected' && status !== 'auto-rejected' && status !== 'completed')) {
      throw new Error('Invalid status. Please provide "accepted" or "rejected"');
    }

    const reference = ref(database, `Orders/${year}/${month}/${day}/${orderId}`);

    const snapshot = await get(reference);

    if (!snapshot.exists()) {
      throw new Error('Order not found');
    }

    const orderData = snapshot.val();

    if (orderData.status !== "pending" && status === "auto-rejected") {
      console.log("Skipping - already processed");
      return res.status(200).send("Already processed");
    }

    const pushToken = orderData.token;
    const coupon = orderData.coupon || null;
    const phone = orderData.phone;
    const price = orderData.totalPrice;

    if (status === "accepted") {
      console.log('Ažuriranje loyalty bodova za telefon:', phone, 'sa cijenom:', price);

      if (phone && price != null) {
        const loyaltyRef = ref(database, `Loyalty/${phone}`);

        const result = await runTransaction(loyaltyRef, (currentData) => {
          let data = currentData || { loyalty_points: 0, awards: 0 };

          data.loyalty_points = (data.loyalty_points || 0) + price;
          data.awards = data.awards || 0;

          return data;
        });

        if (result.committed) {
          console.log(
            `Loyalty podaci za telefon ${phone} uspješno ažurirani. Novi bodovi: ${result.snapshot.val().points}`
          );
        }
      }
    }

    else if ((status === "rejected" || status === "auto-rejected") && coupon) {
      const couponsRef = ref(database, `Loyalty/${phone}/coupons`);
      const couponRef = push(couponsRef);

      const newCoupon = {
        value: 10,
        isUsed: false,
        createdAt: Date.now(),
      };

      await set(couponRef, newCoupon);
    }

    let message = '';
    const lang = orderData.language;
    const title = "Gricko";

    if (status === 'accepted') {
      message = lang === 'hr'
        ? 'Vaša narudžba je prihvaćena'
        : 'Your order has been accepted.';
    }

    else if (status === 'rejected') {
      if (coupon) {
        message = lang === 'hr'
          ? 'Nažalost vaša narudžba je odbijena, ali kupon od 10€ je vraćen na Vaš račun.'
          : 'Unfortunately your order has been rejected, but a 10€ coupon has been returned to your account.';
      } else {
        message = lang === 'hr'
          ? 'Nažalost vaša narudžba je odbijena'
          : 'Unfortunately your order has been rejected.';
      }
    }

    else if (status === 'auto-rejected') {
      if (coupon) {
        message = lang === 'hr'
          ? 'Nažalost vaša narudžba je automatski odbijena zbog prevelikog obujma posla, pokušajte kasnije. Kupon od 10€ je vraćen na Vaš račun.'
          : 'Unfortunately your order was automatically rejected due to high demand. Please try again later. A 10€ coupon has been returned to your account.';
      } else {
        message = lang === 'hr'
          ? 'Nažalost vaša narudžba je automatski odbijena zbog prevelikog obujma posla, pokušajte kasnije.'
          : 'Unfortunately your order was automatically rejected due to high demand. Please try again later.';
      }
    }

    else if (status === 'completed' && !orderData.isDelivery) {
      message = lang === 'hr'
        ? 'Vaša narudžba je završena'
        : 'Your order has been completed.';
    }

    if (message) {
      if (!pushToken) {
        sendSMS(orderData.phone, "Gricko automatska poruka: " + message);
      } else {
        await sendPushNotification(pushToken, title, message);
      }
    }

    await update(reference, { status });

    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

module.exports = { updateOrderStatus };