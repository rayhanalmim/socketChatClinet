import Channel from '#models/channel/channelModel.js';
import redisClient from './../redisClient.js';

export const handleUnreadMessages = (socket, anthillChat) => {
  socket.on('message_read', async ({ userId, conversationId }) => {
    try {
      let isChannel = false;

      // Check if it's a channel or direct message by checking if conversationId is a valid channel ID
      const isValidChannel = await Channel.exists({ _id: conversationId });
      if (isValidChannel) {
        isChannel = true;
      }

      if (isChannel) {
        // Reset unread message count for the user in the channel
        await redisClient.hset(`unread:${conversationId}`, userId, 0);
        anthillChat
          .to(userId)
          .emit('unread_count', { conversationId, count: 0 });

        console.log(
          `User ${userId} read messages in channel ${conversationId}`,
        );
      } else {
        // Handle Direct Message (DM)
        // Reset unread message count for the user in the DM conversation
        await redisClient.hset(`unread:${conversationId}`, userId, 0);
        anthillChat
          .to(userId)
          .emit('unread_count', { conversationId, count: 0 });

        console.log(
          `User ${userId} read messages in direct message ${conversationId}`,
        );
      }
    } catch (error) {
      console.error('Failed to reset unread message count:', error);
    }
  });

  socket.on('fetch_unread_counts', async ({ userId }) => {
    try {
      // Fetch all conversation IDs (DM and channel) that the user is part of
      const conversationIds = await redisClient.smembers(
        `user:${userId}:conversations`,
      );
      if (!conversationIds || conversationIds.length === 0) {
        socket.emit('unread_counts', []);
        return;
      }

      const unreadCounts = await Promise.all(
        conversationIds.map(async (conversationId) => {
          let isChannel = false;

          // Check if the conversationId corresponds to a channel or DM
          const isValidChannel = await Channel.exists({ _id: conversationId });
          if (isValidChannel) {
            isChannel = true;
          }

          const unreadCount =
            (await redisClient.hget(`unread:${conversationId}`, userId)) || 0;
          const lastMessage =
            (await redisClient.hget(
              `last_message:${conversationId}`,
              'message',
            )) || 'No messages yet';
          const lastMessageTime =
            (await redisClient.hget(
              `last_message:${conversationId}`,
              'time',
            )) || 'N/A';

          return {
            conversationId,
            count: unreadCount,
            lastMessage,
            lastMessageTime,
            isChannel,
          };
        }),
      );

      socket.emit('unread_counts', unreadCounts);
      console.log(
        `Fetched unread counts for user ${userId} across ${conversationIds.length} conversations`,
      );
    } catch (error) {
      console.error('Failed to fetch unread message counts:', error);
    }
  });
};
