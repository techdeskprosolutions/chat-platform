require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false } // Required for Render PostgreSQL
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// WebSocket for real-time chat
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
  });

  socket.on('send_message', async (data) => {
    const { sessionId, message, senderType } = data;
    await pool.query(
      'INSERT INTO messages (session_id, sender_type, message) VALUES ($1, $2, $3)',
      [sessionId, senderType, message]
    );
    io.to(sessionId).emit('receive_message', { senderType, message });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});