const { sendSMS } = require("../services/sendSMS");

function frontendStatusSocket(io) {
  let activeFrontend = null;
  const HEARTBEAT_TIMEOUT = 6 * 60 * 1000;

  const scheduleTimeout = () => {
    if (!activeFrontend) return;

    if (activeFrontend.timeoutHandle) {
      clearTimeout(activeFrontend.timeoutHandle);
    }

    activeFrontend.timeoutHandle = setTimeout(() => {
      if (!activeFrontend) return;

      console.log("Frontend nestao (timeout)");
      sendSMS(
        "0958138612",
        "Frontend je nestao (heartbeat timeout)!",
        new Date().toISOString()
      );

      activeFrontend = null;
    }, HEARTBEAT_TIMEOUT);
  };

  io.on("connection", (socket) => {
    socket.data.role = "unknown";

    // 👇 1. REGISTER (MORA BITI PRVI SIGNAL RESTAURANTA)
    socket.on("register", (data) => {
      socket.data.role = data.role; // "admin" | "restaurant"
      console.log("New socket:", socket.id, "role:", socket.data.role);
    });

    // 👇 2. LOGIN (SAMO RESTAURANT)
    socket.on("frontend-logged-in", (data) => {
      if (socket.data.role !== "restaurant") return;

      console.log("Restaurant logged in");

      if (!activeFrontend) {
        activeFrontend = {
          socketId: socket.id,
          lastHeartbeat: Date.now(),
          timeoutHandle: null,
        };

        sendSMS("0958138612", "Frontend je aktivan!", data.timestamp);
      } else {
        activeFrontend.socketId = socket.id;
        activeFrontend.lastHeartbeat = Date.now();
      }

      scheduleTimeout();
    });

    // 👇 3. HEARTBEAT (SAMO RESTAURANT)
    socket.on("heartbeat", () => {
      if (socket.data.role !== "restaurant") return;

      console.log(`💓 HEARTBEAT ${new Date()}`);

      if (!activeFrontend) {
        activeFrontend = {
          socketId: socket.id,
          lastHeartbeat: Date.now(),
          timeoutHandle: null,
        };
      }

      if (activeFrontend.socketId === socket.id) {
        activeFrontend.lastHeartbeat = Date.now();
        scheduleTimeout();
      }

      socket.emit("heartbeat-ack");
    });

    socket.on("frontend-closed", () => {
      if (socket.data.role !== "restaurant") return;

      if (activeFrontend?.socketId === socket.id) {
        if (activeFrontend.timeoutHandle) {
          clearTimeout(activeFrontend.timeoutHandle);
        }

        activeFrontend = null;

        console.log("Frontend zatvoren");

        sendSMS("0958138612", "Frontend je zatvoren!");
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id, socket.data.role);
    });
  });
}


module.exports = frontendStatusSocket;