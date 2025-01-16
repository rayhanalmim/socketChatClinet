const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle joining a room (e.g., channel)
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
      io.to(roomId).emit('user_joined', { userId: socket.id });
    });

    // Handle messages
    socket.on('send_message', ({ roomId, message }) => {
      console.log(`Message from ${socket.id} in room ${roomId}: ${message}`);
      io.to(roomId).emit('receive_message', {
        userId: socket.id,
        message,
        timestamp: new Date(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

export default socketHandler;
