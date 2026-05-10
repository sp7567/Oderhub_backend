/**
 * src/sockets/orderHandlers.js
 * Modular handlers for socket events.
 */

const setupOrderHandlers = (io, socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  const joinStore = (storeId) => {
    const room = !storeId || storeId === "global" ? "global" : storeId;
    socket.join(room);
    console.log(`📡 Socket ${socket.id} joined room: ${room}`);
    socket.emit("room_joined", { storeId: room, timestamp: new Date() });
  };

  const leaveStore = (storeId) => {
    const room = !storeId || storeId === "global" ? "global" : storeId;
    socket.leave(room);
    console.log(`📡 Socket ${socket.id} left room: ${room}`);
  };

  // Join a specific store's room
  socket.on("join_store", (storeId) => {
    joinStore(storeId);
  });

  // Leave a specific store's room
  socket.on("leave_store", (storeId) => {
    leaveStore(storeId);
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
  });
};

module.exports = setupOrderHandlers;
