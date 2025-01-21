import { handleChannelEvents } from './handlers/channelHandlers.js';
import { handleDMEvents } from './handlers/dmHandlers.js';
import { handleUtilityEvents } from './handlers/utils.js';

const activeUsers = new Map();

const socketHandler = (io) => {
  const anthillChat = io.of('/anthillChat');

  anthillChat.on('connection', (socket) => {
    console.log(`User connected to anthillChat namespace: ${socket.id}`);

    socket.on('active_user', ({ userId }) => {
      activeUsers.set(userId, socket.id);
      anthillChat.emit('active_users', Array.from(activeUsers.keys()));
      console.log(`User ${userId} is now active.`);
    });

    socket.on('disconnect', () => {
      activeUsers.forEach((socketId, userId) => {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          console.log(`User ${userId} disconnected.`);
        }
      });
      anthillChat.emit('active_users', Array.from(activeUsers.keys()));
    });

    handleChannelEvents(socket, anthillChat);
    handleDMEvents(socket, anthillChat);
    handleUtilityEvents(socket, anthillChat);
  });
};

export default socketHandler;
