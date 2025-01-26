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

      console.log(
        `User ${userId} read messages in direct message ${conversationId}`
      );
    } catch (error) {
      console.error("Failed to reset unread message count:", error);
    }
  });

  socket.on("fetch_unread_counts", async ({ userId }) => {
    try {
      // Fetch all conversation IDs (DM) that the user is part of
      console.log("userId", userId);
      const conversationKeys = await redisClient.keys(`conversation:*:info`);
      const conversationIds = conversationKeys.map(key => key.split(':')[1]);
      console.log("conversationIds", conversationIds);

      if (!conversationIds || conversationIds.length === 0) {
        socket.emit("unread_counts", []);
        return;
      }

      const unreadCounts = await Promise.all(
        conversationIds.map(async (conversationId) => {
          const conversationInfoKey = `conversation:${conversationId}:info`;

          // Get unread count directly without 'unread:' prefix
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

      socket.emit("unread_counts", unreadCounts);
      console.log(
        `Fetched unread counts for user ${userId} across ${conversationIds.length} conversations`
      );
    } catch (error) {
      console.error("Failed to fetch unread message counts:", error);
    }
  });
};
