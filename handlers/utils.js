import mongoose from "mongoose";
import Message from "#models/messages/messagesModel.js";
import Employee from "#models/authModels/employeeModel.js";

export const createConversationId = (user1, user2) =>
  [user1, user2].sort().join("_");

export const fetchMessages = async (filter, limit = 50) =>
  Message.find(filter).sort({ createdAt: -1 }).limit(limit);

export const handleError = (socket, error, clientMessage) => {
  console.error(clientMessage, error);
  socket.emit("error", clientMessage);
};

export const handleUtilityEvents = (socket, anthillChat) => {
  socket.on("add_reaction", async ({ messageId, reaction, userId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid Message ID");
      }

      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error("Message not found");
      }

      const existingReaction = message.reactions.find(
        (r) => r.userId.toString() === userId && r.reaction === reaction
      );

      if (existingReaction) {
        message.reactions = message.reactions.filter(
          (r) => !(r.userId.toString() === userId && r.reaction === reaction)
        );
      } else {
        message.reactions.push({ userId, reaction });
      }

      await message.save();

      anthillChat.to(message.channelId).emit("reaction_updated", {
        messageId,
        reactions: message.reactions,
      });
    } catch (error) {
      handleError(socket, error, "Failed to add reaction to the message");
    }
  });

  socket.on("edit_message", async ({ messageId, newContent, userId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid Message ID");
      }

      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error("Message not found");
      }

      if (message.senderId.toString() !== userId) {
        throw new Error("Unauthorized: You can only edit your own messages");
      }

      //user cant edit message after 1 hour of creation
      const oneHour = 60 * 60 * 1000;
      if (new Date() - new Date(message.createdAt) > oneHour) {
        throw new Error("You cannot edit the message after 1 hour of creation");
      }

      message.content = newContent;
      message.edited = true;
      await message.save();

      anthillChat.to(message.channelId).emit("message_edited", {
        messageId,
        newContent,
      });

      console.log(`Message ${messageId} edited by user ${userId}`);
    } catch (error) {
      handleError(socket, error, "Failed to edit the message");
    }
  });

  socket.on("typing", async ({ channelId, userId, conversationId }) => {
    try {
      const user = await Employee.findById(userId);
      if (!user) throw new Error("User not found");

      if (channelId) {
        anthillChat.to(channelId).emit("typing", { userId, name: user.name });
      } else if (conversationId) {
        anthillChat.to(conversationId).emit("typing", { userId, name: user.name });
      }
    } catch (error) {
      handleError(socket, error, "Error in typing indicator");
    }
  });

  socket.on("stop_typing", async ({ channelId, userId, conversationId }) => {
    try {
      const user = await Employee.findById(userId);
      if (!user) throw new Error("User not found");

      if (channelId) {
        anthillChat
        .to(channelId)
        .emit("stop_typing", { userId, name: user.name });
      } else if (conversationId) {
        anthillChat
        .to(conversationId)
        .emit("stop_typing", { userId, name: user.name });
      }
      
    } catch (error) {
      handleError(socket, error, "Error in stopping typing indicator");
    }
  });
};
