import redisClient from '../redisClient.js';

export const handlePresenceTracking = (socket, anthillChat) => {
  socket.on('user_online', async ({ userId }) => {
    try {
      // Mark user as online
      socket.userId = userId; 
      await redisClient.hset(`presence:${userId}`, 'status', 'online');
      await redisClient.hset(`presence:${userId}`, 'lastSeen', Date.now());

      console.log(`User ${userId} is now online`);
      anthillChat.emit('user_presence_updated', { userId, status: 'online' });

      // Emit the presence status of all users
      const allUsers = await redisClient.keys('presence:*');
      const presenceStatuses = await Promise.all(allUsers.map(async (key) => {
        const userId = key.split(':')[1];
        const status = await redisClient.hget(key, 'status');
        const lastSeen = await redisClient.hget(key, 'lastSeen');
        return { userId, status, lastSeen };
      }));
      anthillChat.emit('all_users_presence', presenceStatuses);
    } catch (error) {
      console.error('Failed to mark user as online:', error);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const userId = socket.userId; 
      // Mark user as offline
      await redisClient.hset(`presence:${userId}`, 'status', 'offline');
      await redisClient.hset(`presence:${userId}`, 'lastSeen', Date.now());

      console.log(`User ${userId} disconnected`);
      anthillChat.emit('user_presence_updated', {
        userId,
        status: 'offline',
        lastSeen: Date.now(),
      });

      // Emit the presence status of all users
      const allUsers = await redisClient.keys('presence:*');
      const presenceStatuses = await Promise.all(allUsers.map(async (key) => {
        const userId = key.split(':')[1];
        const status = await redisClient.hget(key, 'status');
        const lastSeen = await redisClient.hget(key, 'lastSeen');
        return { userId, status, lastSeen };
      }));
      anthillChat.emit('all_users_presence', presenceStatuses);
    } catch (error) {
      console.error('Failed to mark user as offline:', error);
    }
  });

  socket.on('check_user_presence', async ({ userId }) => {
    try {
      const status = await redisClient.hget(`presence:${userId}`, 'status');
      const lastSeen = await redisClient.hget(`presence:${userId}`, 'lastSeen');
      socket.emit('user_presence_status', { userId, status, lastSeen });
    } catch (error) {
      console.error('Failed to fetch user presence status:', error);
    }
  });
};
