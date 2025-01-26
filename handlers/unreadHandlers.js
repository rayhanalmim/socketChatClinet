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

  socket.on("fetch_unread_counts", async ({ userId }) => {
    try {
      // Join the user to their personal room
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
  
      // Fetch all conversation IDs (DM) that the user is part of
      const conversationKeys = await redisClient.keys(`conversation:*:info`);
      const conversationIds = conversationKeys.map((key) => key.split(":")[1]);
  
      if (!conversationIds || conversationIds.length === 0) {
        socket.emit("unread_counts", []);
        return;
      }
  
      // Fetch unread counts for each conversation
      const unreadCounts = await Promise.all(
        conversationIds.map(async (conversationId) => {
          const conversationInfoKey = `conversation:${conversationId}:info`;
  
          const unreadCount =
            (await redisClient.hget(conversationInfoKey, `${userId}`)) || 0;
  
          const lastMessage =
            (await redisClient.hget(conversationInfoKey, "last_message")) ||
            "No messages yet";
  
          const lastMessageTime =
            (await redisClient.hget(
              conversationInfoKey,
              "last_message_time"
            )) || "N/A";
  
          return {
            conversationId,
            count: parseInt(unreadCount, 10),
            lastMessage,
            lastMessageTime,
            isChannel: false,
          };
        })
      );
  
      // Emit the unread counts to the user
      socket.emit("unread_counts", unreadCounts);
  
      console.log(
        `Fetched unread counts for user ${userId} across ${conversationIds.length} conversations`
      );
    } catch (error) {
      console.error("Failed to fetch unread message counts:", error);
    }
  });
  
};
