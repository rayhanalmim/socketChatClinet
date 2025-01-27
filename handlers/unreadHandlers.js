import redisClient from "./../redisClient.js";

export const handleUnreadMessages = (socket, anthillChat) => {
  socket.on("message_read", async ({ userId, conversationId }) => {
    try {
      // Reset unread message count for the user in the DM conversation
      const conversationInfoKey = `conversation:${conversationId}:info`;
      await redisClient.hset(conversationInfoKey, `${userId}`, 0);
      anthillChat
        .to(userId)
        .emit("unread_counts", { conversationId, count: 0 });
    } catch (error) {
      console.error("Failed to reset unread message count:", error);
    }
  });

  socket.on("fetch_unread_counts", async ({ userId, channelId }) => {
    try {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
  
      const unreadCounts = [];
  
      // If a channelId is provided, only fetch unread counts for the channel
      if (channelId) {
        const channelKey = `channel:${channelId}:info`;
  
        const unreadCount =
          (await redisClient.hget(channelKey, `${userId}`)) || 0;
  
        const lastMessage =
          (await redisClient.hget(channelKey, "last_message")) ||
          "No messages yet";
  
        const lastMessageTime =
          (await redisClient.hget(channelKey, "last_message_time")) || "N/A";
  
        unreadCounts.push({
          channelId,
          count: parseInt(unreadCount, 10),
          lastMessage,
          lastMessageTime,
          isChannel: true,
        });
  
        console.log("Fetched unread counts for channel:", unreadCounts);
      } else {
        // If no channelId is provided, fetch unread counts for direct messages
        const conversationKeys = await redisClient.keys(`conversation:*:info`);
        const conversationIds = conversationKeys.map((key) => key.split(":")[1]);
  
        for (const conversationId of conversationIds) {
          const conversationInfoKey = `conversation:${conversationId}:info`;
          const unreadCount =
            (await redisClient.hget(conversationInfoKey, `${userId}`)) || 0;
  
          const lastMessage =
            (await redisClient.hget(conversationInfoKey, "last_message")) ||
            "No messages yet";
  
          const lastMessageTime =
            (await redisClient.hget(conversationInfoKey, "last_message_time")) ||
            "N/A";
  
          unreadCounts.push({
            conversationId,
            count: parseInt(unreadCount, 10),
            lastMessage,
            lastMessageTime,
            isChannel: false,
          });
        }
  
        console.log("Fetched unread counts for direct messages:", unreadCounts);
      }
  
      socket.emit("unread_counts", unreadCounts);
  
      console.log(
        `Fetched unread counts for user ${userId} ${
          channelId ? `in channel ${channelId}` : "for direct messages"
        }`
      );
    } catch (error) {
      console.error("Failed to fetch unread message counts:", error);
    }
  });
  
};
