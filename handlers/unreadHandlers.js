import redisClient from '../redisClient.js';

export const handleUnreadMessages = (socket, anthillChat) => {
  socket.on('message_read', async ({ userId, conversationId }) => {
    try {
      // Reset unread message count for the user in the conversation
      await redisClient.hset(`unread:${conversationId}`, userId, 0);
      
      // Emit the updated unread count to the user
      anthillChat.to(userId).emit('unread_count', { conversationId, count: 0 });
      
      console.log(`User ${userId} read messages in conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to reset unread message count:', error);
    }
  });

  socket.on('fetch_unread_count', async ({ userId, conversationId }) => {
    try {
      // Fetch unread message count for the user in the conversation
      const unreadCount = await redisClient.hget(`unread:${conversationId}`, userId);
      
      // Emit the current unread count to the user
      socket.emit('unread_count', { conversationId, count: unreadCount || 0 });
      
      console.log(`Fetched unread count for user ${userId} in conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to fetch unread message count:', error);
    }
  });
};