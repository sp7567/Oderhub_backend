/**
 * server.js — Entry point for the Order Management API
 */

require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const socketIO = require("./src/utils/socketIO");
const setupOrderHandlers = require("./src/sockets/orderHandlers");

const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO.init(server);

// Setup connection handlers
io.on("connection", (socket) => {
  setupOrderHandlers(io, socket);
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket enabled`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  });

  // Gracefully handle port-already-in-use
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Retrying in 2s…`);
      setTimeout(() => {
        server.close();
        server.listen(PORT);
      }, 2000);
    } else {
      throw err;
    }
  });
});
