const { sendSMS } = require("../services/sendSMS");

function frontendStatusSocket(io) {
  let activeFrontend = null; // { socketId, lastHeartbeat, timeoutHandle }

  const HEARTBEAT_TIMEOUT = 40000; // 40 sekundi

  const setHeartbeatTimeout = (socket) => {
    if (!activeFrontend) return;
    if (activeFrontend.timeoutHandle) clearTimeout(activeFrontend.timeoutHandle);

    activeFrontend.timeoutHandle = setTimeout(() => {
      console.log("⏰ Heartbeat timeout, frontend nestao:", socket.id);
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
        console.log("✅ SMS poslan: frontend je aktivan");
      } else {
        console.log("♻️ Frontend se reconnectao:", socket.id);
        activeFrontend.socketId = socket.id;
      }
      setHeartbeatTimeout(socket);
    });

    socket.on("frontend-closed", (data) => {
      if (activeFrontend && activeFrontend.socketId === socket.id) {
        activeFrontend = null;
        console.log("✅ SMS poslan: frontend je zatvoren");
        sendSMS("0958138612", "Frontend je zatvoren!", data.timestamp);
      }
    });

    socket.on("heartbeat", (data) => {
      if (activeFrontend && activeFrontend.socketId === socket.id) {
        activeFrontend.lastHeartbeat = Date.now();
        console.log(`💓 Last heartbeat: ${data.timestamp}`);
        setHeartbeatTimeout(socket); // resetiraj timeout svaki put kad stigne heartbeat
      }
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Socket disconnected:", socket.id);
      // ne šaljemo SMS odmah → čekamo heartbeat timeout
    });
  });
}

module.exports = frontendStatusSocket;
