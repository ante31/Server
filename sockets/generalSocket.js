const { ref, onValue } = require('firebase/database');

function generalSocket(io, database) {
  let currentGeneralData = null;

  const generalRef = ref(database, 'General');


  onValue(generalRef, (snapshot) => {
    const currentGeneralData = snapshot.val();
    io.emit('general-update', currentGeneralData);
  });

  io.on('connection', (socket) => {

    if (currentGeneralData !== null) {
      socket.emit('general-update', currentGeneralData);
    }
  });
}

module.exports = generalSocket;
