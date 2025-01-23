import mongoose from 'mongoose';
import Channel from '#models/channel/channelModel.js';
import Message from '#models/messages/messagesModel.js';
import ChannelUser from '#models/channelUser/channelUserModel.js';
import Employee from '#models/authModels/employeeModel.js';
import { fetchMessages, handleError } from './utils.js';
import { uploadObject } from '#config/space.js';

export const handleChannelEvents = (socket, anthillChat) => {
  socket.on('join_channel', async ({ channelId, userId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new Error('Invalid Channel ID');
      }

      const channel = await Channel.findById(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      const channelUser = await ChannelUser.findOne({ channelId, userId });
      if (!channelUser) {
        throw new Error('You are not a member of this channel');
      }

      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      socket.join(channelId);

      console.log(`User ${userId} joined channel ${channelId}`);

      const messages = await fetchMessages({ channelId });
      socket.emit('message_history', messages);

      anthillChat
        .to(channelId)
        .emit('user_joined', { userId, username: channelUser.username });
    } catch (error) {
      handleError(socket, error, 'Failed to join the channel');
    }
  });

  socket.on('leave_channel', async ({ channelId, userId }) => {
    try {
      if (!channelId) throw new Error('Channel ID is required');

      console.log(`User ${userId} leaving channel ${channelId}`);
      socket.leave(channelId);

      anthillChat.to(channelId).emit('user_left', { userId });
    } catch (error) {
      handleError(socket, error, 'Failed to leave the channel');
    }
  });

  socket.on(
    'send_message',
    async ({
      channelId,
      content,
      userId,
      messageType = 'text',
      attachment = null, // Single file attachment
    }) => {
      try {
        // Validate channel ID
        if (!mongoose.Types.ObjectId.isValid(channelId)) {
          throw new Error('Invalid Channel ID');
        }


        console.log('all', channelId, content, userId, messageType, attachment);

        // Check if the user is a member of the channel
        const channelUser = await ChannelUser.findOne({ channelId, userId });
        if (!channelUser) {
          throw new Error('You are not a member of this channel');
        }

        // Fetch user details
        const user = await Employee.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        // Handle file attachment (if provided)
        let attachmentUrl = null;
        if (attachment && messageType !== 'text') {
          // Generate a unique file path
          const filePath = `antschat/${Date.now()}-${attachment.name}`;

          // Upload the file to S3 using your existing `uploadObject` function
          await uploadObject(filePath, attachment.data);

          // Store the file URL in the `attachment` field
          attachmentUrl = filePath; // Or the full S3 URL if `uploadObject` returns it
        }

        // Create and save the message
        const message = new Message({
          channelId,
          senderId: userId,
          senderImage : user.dp,
          senderName: user.name,
          content,
          messageType,
          attachment: attachmentUrl, // Save the file URL (or null if no attachment)
        });

        await message.save();

        // Emit the message to the channel
        anthillChat.to(channelId).emit('receive_message', message);
        console.log(`Message sent in channel ${channelId} by ${userId}`);
      } catch (error) {
        handleError(socket, error, 'Failed to send the message');
      }
    },
  );
};
