const { ref, onValue, onChildAdded, onChildChanged, get } = require('firebase/database');

function ordersSocket(io, database) {
  let listener = null;

  // Pomoćna funkcija za generiranje putanje na temelju današnjeg datuma
  function getTodayPath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `Orders/${year}/${month}/${day}`;
  }

  function startListener() {
    if (listener) listener.off?.(); 

    const ordersPath = getTodayPath(); // Koristimo funkciju ovdje
    const ordersRef = ref(database, ordersPath);

    console.log('📡 Listener aktiviran na putanji:', ordersPath);

    listener = onChildAdded(ordersRef, (snapshot) => {
      const newOrder = snapshot.val();
      const orderId = snapshot.key;
      console.log('Firebase - Nova narudžba:', orderId);
      io.emit('order-added', { id: orderId, ...newOrder });
    });

    onChildChanged(ordersRef, (snapshot) => {
      const updatedOrder = snapshot.val();
      const orderId = snapshot.key;
      if (updatedOrder.status) {
        io.emit(`order-updated-${orderId}`, { id: orderId, ...updatedOrder });
      }
    });
  }

  // KADA SE KLIJENT SPOJI -> ODMAH MU POŠALJI SVE ZA DANAS
  io.on('connection', (socket) => {
    console.log('🔌 Klijent spojen, šaljem inicijalne narudžbe...');
    
    const ordersPath = getTodayPath(); // I ovdje koristimo funkciju
    const currentOrdersRef = ref(database, ordersPath);

    get(currentOrdersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const orders = snapshot.val();
        socket.emit('initial-orders', orders);
        console.log(`📦 Poslano ${Object.keys(orders).length} narudžbi klijentu ${socket.id}`);
      }
    }).catch(err => console.error("Greška pri sinkronizaciji:", err));
  });

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
    startListener();

    setInterval(() => {
      console.log('Refresha se orders socket');
      startListener();
    }, 1000 * 60 * 60 * 24);
  }, msUntilNextRefresh);
}

module.exports = ordersSocket;