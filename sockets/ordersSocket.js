const { ref, onValue, onChildAdded, onChildChanged } = require('firebase/database');

function ordersSocket(io, database) {
  let listener = null;

  function startListener() {
    if (listener) listener.off?.(); // ako postoji stari listener, ugasi ga

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const ordersPath = `Orders/${year}/${month}/${day}`;
    const ordersRef = ref(database, ordersPath);

    console.log('path:', ordersPath);

    listener = onChildAdded(ordersRef, (snapshot) => {
      const newOrder = snapshot.val();
      const orderId = snapshot.key;
      console.log('Firebase - Nova narudžba dodana:', orderId, newOrder);
      io.emit('order-added', { id: orderId, ...newOrder });
    });

    onChildChanged(ordersRef, (snapshot) => {
      const updatedOrder = snapshot.val();
      const orderId = snapshot.key;
      if (updatedOrder.status) {
        console.log('Firebase - Status narudžbe promijenjen:', orderId, updatedOrder.status);
        io.emit(`order-updated-${orderId}`, { id: orderId, ...updatedOrder });
      }
    });
  }

  startListener();

  // koliko milisekundi do sljedećih 03:00 ujutro
  const now = new Date();
  const nextRefresh = new Date(now);
  nextRefresh.setHours(3, 0, 0, 0);
  if (now >= nextRefresh) {
    // ako je već prošlo 03:00 danas, pomakni na sutra
    nextRefresh.setDate(nextRefresh.getDate() + 1);
  }

  const msUntilNextRefresh = nextRefresh.getTime() - now.getTime();

  setTimeout(() => {
    console.log('Prvi refresh u 03:00');
    startListener();

    // Svakih 24h nakon toga
    setInterval(() => {
      console.log('Refresha se orders socket');
      startListener();
    }, 1000 * 60 * 60 * 24);
  }, msUntilNextRefresh);
}

module.exports = ordersSocket;