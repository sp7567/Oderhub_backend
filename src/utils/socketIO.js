/**
 * src/utils/socketIO.js
 * Singleton helper to hold the 'io' instance so we can emit events 
 * from controllers and services without passing the 'io' object everywhere.
 */

let io;

module.exports = {
  init: (serverInstance) => {
    const { Server } = require("socket.io");
    io = new Server(serverInstance, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"],
      },
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
  // Helper to emit to a specific store room
  emitToStore: (storeId, event, data) => {
    if (io) {
      console.log(`📡 Emitting [${event}] to room [${storeId}]`);
      io.to(storeId).emit(event, data);
    }
  },
  // Helper to emit to all
  emitToAll: (event, data) => {
    if (io) {
      console.log(`📡 Emitting [${event}] to ALL`);
      io.emit(event, data);
    }
  }
};
