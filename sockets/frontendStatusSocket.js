const { sendSMS } = require("../services/sendSMS");

function frontendStatusSocket(io) {
  let activeFrontend = null;

  const HEARTBEAT_TIMEOUT = 7 * 60 * 1000;

  const scheduleTimeout = (socket) => {
    if (!activeFrontend) return;

    if (activeFrontend.timeoutHandle) {
      clearTimeout(activeFrontend.timeoutHandle);
    }

    const timeoutVersion = Date.now();
    activeFrontend.timeoutVersion = timeoutVersion;

    activeFrontend.timeoutHandle = setTimeout(() => {
      if (
        !activeFrontend ||
        activeFrontend.timeoutVersion !== timeoutVersion
      ) {
        return;
      }

      sendSMS(
        "0958138612",
        "Frontend je nestao (heartbeat timeout)!",
        new Date().toISOString()
      );

      activeFrontend = null;
    }, HEARTBEAT_TIMEOUT);
  };

  io.on("connection", (socket) => {
    socket.on("frontend-logged-in", (data) => {
      if (data.isAdmin) return;

      const wasOffline = !activeFrontend;

      activeFrontend = {
        socketId: socket.id,
        lastHeartbeat: Date.now(),
      };

      if (wasOffline) {
        sendSMS(
          "0958138612",
          "Frontend je aktivan!",
          data.timestamp
        );
      }

      scheduleTimeout(socket);
    });

    socket.on("heartbeat", (data) => {
      if (data.isAdmin) return;

      activeFrontend = {
        socketId: socket.id,
        lastHeartbeat: Date.now(),
      };

      scheduleTimeout(socket);

      socket.emit("heartbeat-ack", {
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("frontend-closed", (data) => {
      if (data.isAdmin) return;

      if (activeFrontend?.timeoutHandle) {
        clearTimeout(activeFrontend.timeoutHandle);
      }

      activeFrontend = null;

      sendSMS(
        "0958138612",
        "Frontend je zatvoren!",
        data.timestamp
      );
    });

    socket.on("disconnect", () => {
      // intentionally empty
    });
  });
}

module.exports = frontendStatusSocket;
