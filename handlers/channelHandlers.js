/* eslint-disable no-undef */
import mongoose from "mongoose";
import Channel from "#models/channel/channelModel.js";
import Message from "#models/messages/messagesModel.js";
import ChannelUser from "#models/channelUser/channelUserModel.js";
import Employee from "#models/authModels/employeeModel.js";
import { fetchMessages, handleError, updateCache } from "./utils.js";
import { uploadBuffer } from "#config/space.js";
import redisClient from "./../redisClient.js";

export const handleChannelEvents = (socket, anthillChat) => {
  socket.on("join_channel", async ({ channelId, userId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new Error("Invalid Channel ID");
      }

      const channel = await Channel.findById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      const channelUser = await ChannelUser.findOne({ channelId, userId });
      if (!channelUser) {
        throw new Error("You are not a member of this channel");
      }

      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      socket.join(channelId);

      console.log(`User ${userId} joined channel ${channelId}`);

      const messages = await fetchMessages({ channelId });
      socket.emit("message_history", messages);

      anthillChat
        .to(channelId)
        .emit("user_joined", { userId, username: channelUser.username });
    } catch (error) {
      handleError(socket, error, "Failed to join the channel");
    }
  });

  socket.on("leave_channel", async ({ channelId, userId }) => {
    try {
      if (!channelId) throw new Error("Channel ID is required");

      console.log(`User ${userId} leaving channel ${channelId}`);
      socket.leave(channelId);

      anthillChat.to(channelId).emit("user_left", { userId });
    } catch (error) {
      handleError(socket, error, "Failed to leave the channel");
    }
  });

  socket.on(
    "send_message",
    async ({
      channelId,
      content,
      userId,
      messageType = "text",
      attachmentData, // Single file attachment
    }) => {
      try {
        // Validate channel ID
        if (!mongoose.Types.ObjectId.isValid(channelId)) {
          throw new Error("Invalid Channel ID");
        }

        // Check if the user is a member of the channel
        const channelUser = await ChannelUser.findOne({ channelId, userId });
        if (!channelUser) {
          throw new Error("You are not a member of this channel");
        }

        // Fetch user details
        const user = await Employee.findById(userId);
        if (!user) {
          throw new Error("User not found");
        }

        let attachmentUrl = null;

        // Handle attachment (if provided)
        if (attachmentData.attachment) {
          console.log("Full attachment object:", attachmentData.attachment);

          // Decode base64 string to buffer
          const buffer = Buffer.from(attachmentData.attachment.data, "base64");

          // Upload file to DigitalOcean Spaces
          const result = await uploadBuffer(
            attachmentData.filePath,
            buffer,
            attachmentData.attachment.mimetype
          );

          attachmentUrl = result;
        }

        // Create and save the message
        const message = new Message({
          channelId,
          senderId: userId,
          senderImage: user.dp,
          senderName: user.name,
          content,
          messageType,
          attachment: attachmentUrl, // Save the file URL (or null if no attachment)
        });

        await message.save();

        // Update cache
        await updateCache({ channelId }, message);

        // Increment unread message count for the channel members
        const channelMembers = await ChannelUser.find({ channelId });
        for (const member of channelMembers) {
          if (member.userId.toString() !== userId) {
            await redisClient.hincrby(`unread:${channelId}`, member.userId.toString(), 1);
            const unreadCount = await redisClient.hget(`unread:${channelId}`, member.userId.toString());
            anthillChat.to(member.userId.toString()).emit('unread_count', { channelId, count: unreadCount });
          }
        }

        // Emit the message to the channel
        anthillChat.to(channelId).emit("receive_message", message);
        console.log(`Message sent in channel ${channelId} by ${userId}`);
      } catch (error) {
        handleError(socket, error, "Failed to send the message");
      }
    }
  );
};
