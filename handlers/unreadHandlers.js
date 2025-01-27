import redisClient from "./../redisClient.js";

export const handleUnreadMessages = (socket, anthillChat) => {
  socket.on("message_read", async ({ userId, conversationId, channelId }) => {
    try {
      console.log(
        "args from message_read: ",
        userId,
        conversationId,
        channelId
      );
      if (channelId) {
        // Reset unread message count for the user in the channel
        const channelInfoKey = `channel:${channelId}:info`;
        await redisClient.hset(channelInfoKey, `${userId}`, 0);

        // Get latest channel info to emit
        const lastMessage =
          (await redisClient.hget(channelInfoKey, "last_message")) ||
          "No messages yet";
        const lastMessageTime =
          (await redisClient.hget(channelInfoKey, "last_message_time")) ||
          "N/A";

        anthillChat.to(userId).emit("unread_counts", {
          channelId,
          count: 0,
          lastMessage,
          lastMessageTime,
          isChannel: true,
        });

        console.log("if block hit from the channel");
      } else if (conversationId) {
        // Reset unread message count for the user in the DM conversation
        const conversationInfoKey = `conversation:${conversationId}:info`;
        await redisClient.hset(conversationInfoKey, `${userId}`, 0);

        // Get latest conversation info to emit
        const lastMessage =
          (await redisClient.hget(conversationInfoKey, "last_message")) ||
          "No messages yet";
        const lastMessageTime =
          (await redisClient.hget(conversationInfoKey, "last_message_time")) ||
          "N/A";

        anthillChat.to(userId).emit("unread_counts", {
          conversationId,
          count: 0,
          lastMessage,
          lastMessageTime,
          isChannel: false,
        });
      }
    } catch (error) {
      console.error("Failed to reset unread message count:", error);
    }
  });

  socket.on("fetch_unread_counts", async ({ userId }) => {
    console.log("trigger from fetch_unread_counts: ", userId);
    try {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
  
      // Arrays to store unread counts for channels and DMs
      const channelUnreadCounts = [];
      const dmUnreadCounts = [];
  
      // Fetch unread counts for all channels
      const channelKeys = await redisClient.keys(`channel:*:info`);
      const channelIds = channelKeys.map((key) => key.split(":")[1]);
  
      for (const channelId of channelIds) {
        const channelKey = `channel:${channelId}:info`;
  
        const unreadCount =
          (await redisClient.hget(channelKey, `${userId}`)) || 0;
  
        const lastMessage =
          (await redisClient.hget(channelKey, "last_message")) ||
          "No messages yet";
  
        const lastMessageTime =
          (await redisClient.hget(channelKey, "last_message_time")) || "N/A";
  
        channelUnreadCounts.push({
          channelId,
          count: parseInt(unreadCount, 10),
          lastMessage,
          lastMessageTime,
          isChannel: true,
        });
      }
  
      // Fetch unread counts for direct messages
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
  
        dmUnreadCounts.push({
          conversationId,
          count: parseInt(unreadCount, 10),
          lastMessage,
          lastMessageTime,
          isChannel: false,
        });
      }
  
      // Emit the separate arrays for channels and DMs
      socket.to(userRoom).emit("unread_counts", {
        channels: channelUnreadCounts,
        directMessages: dmUnreadCounts,
      });
  
      console.log(`Fetched unread counts for user ${userId}`);
      console.log("Channels unread counts:", channelUnreadCounts);
      console.log("Direct messages unread counts:", dmUnreadCounts);
    } catch (error) {
      console.error("Failed to fetch unread message counts:", error);
    }
  });
  
};
