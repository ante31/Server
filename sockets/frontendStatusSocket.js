// backend/socket.js
const { sendSMS } = require("../services/sendSMS");

function frontendStatusSocket(io) {
  let activeFrontend = null; // { socketId, lastHeartbeat, timeoutHandle }
  const HEARTBEAT_TIMEOUT = 3 * 60 * 1000; // 3 minute

  const scheduleTimeout = (socket) => {
    if (!activeFrontend) return;
    if (activeFrontend.timeoutHandle) clearTimeout(activeFrontend.timeoutHandle);

    activeFrontend.timeoutHandle = setTimeout(() => {
      console.log("⏰ Frontend nestao (heartbeat timeout):", socket.id);
      sendSMS("0958138612", "Frontend je nestao (heartbeat timeout)!", new Date().toISOString());
      activeFrontend = null;
    }, HEARTBEAT_TIMEOUT);
  };

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("frontend-logged-in", (data) => {
      if (!activeFrontend) {
        activeFrontend = { socketId: socket.id, lastHeartbeat: Date.now(), timeoutHandle: null };
        sendSMS("0958138612", "Frontend je aktivan!", data.timestamp);
        console.log("✅ Frontend aktivan, SMS poslan");
      } else {
        activeFrontend.socketId = socket.id;
        activeFrontend.lastHeartbeat = Date.now();
        console.log("♻️ Frontend reconnectao:", socket.id);
      }
      scheduleTimeout(socket);
    });

    socket.on("heartbeat", (data) => {
      if (activeFrontend && activeFrontend.socketId === socket.id) {
        activeFrontend.lastHeartbeat = Date.now();
        scheduleTimeout(socket);
        socket.emit("heartbeat-ack", { timestamp: new Date().toISOString() });
      }
    });

    socket.on("frontend-closed", (data) => {
      if (activeFrontend && activeFrontend.socketId === socket.id) {
        activeFrontend = null;
        sendSMS("0958138612", "Frontend je zatvoren!", data.timestamp);
        console.log("✅ Frontend zatvoren, SMS poslan");
      }
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", socket.id, "Reason:", reason);
      // ne šaljemo SMS odmah, čekamo HEARTBEAT_TIMEOUT
    });
  });
}

module.exports = frontendStatusSocket;
