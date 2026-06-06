const { ref, onValue, onChildAdded, onChildChanged, get, set } = require('firebase/database');

function ordersSocket(io, database) {
  let listener = null;
  const deliveryTimeRef = ref(database, `Loyalty/deliveryTime`);
  const pickUpTimeRef = ref(database, `Loyalty/pickUpTime`);

  function resetDaily() {
    set(deliveryTimeRef, 50);
    set(pickUpTimeRef, 10);
  }

  // Pomoćna funkcija za generiranje putanje na temelju današnjeg datuma
  function getTodayPath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `Orders/${year}/${month}/${day}`;
  }

  let unsubscribeAdded = null; // 👈 OVO DODAŠ OVDJE

  function startListener() {
    console.log("INSTANCE ID:", process.pid);
    const ordersPath = getTodayPath();
    const ordersRef = ref(database, ordersPath);

    console.log("Listener aktiviran:", ordersPath);

    // 👇 UGASI STARO
    if (unsubscribeAdded) {
      unsubscribeAdded();
    }

    // 👇 NOVO
    unsubscribeAdded = onChildAdded(ordersRef, (snapshot) => {
      const newOrder = snapshot.val();
      const orderId = snapshot.key;

      console.log("Firebase - Nova narudžba:", orderId);

      io.emit("order-added", {
        id: orderId,
        ...newOrder,
      });
    });

    // Promjena postojeće narudžbe
    // onChildChanged(ordersRef, (snapshot) => {
    //   const updatedOrder = snapshot.val();
    //   const orderId = snapshot.key;

    //   console.log(
    //     `Firebase - Narudžba ${orderId} promijenjena, status: ${updatedOrder.status}`
    //   );

    //   io.emit("order-updated", {
    //     id: orderId,
    //     ...updatedOrder,
    //   });
    // });
  }

  startListener();

  // Logika za 03:00 ujutro
  const now = new Date();
  const nextRefresh = new Date(now);
  nextRefresh.setHours(3, 0, 0, 0);
  if (now >= nextRefresh) {
    nextRefresh.setDate(nextRefresh.getDate() + 1);
  }

  const msUntilNextRefresh = nextRefresh.getTime() - now.getTime();

  setTimeout(() => {
    console.log('Prvi refresh u 03:00');
    resetDaily();
    startListener();

    setInterval(() => {
      console.log('Refresha se orders socket');
      resetDaily();
      startListener();
    }, 1000 * 60 * 60 * 24);
  }, msUntilNextRefresh);
}

module.exports = ordersSocket;