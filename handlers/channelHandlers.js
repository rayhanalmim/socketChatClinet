import mongoose from 'mongoose';
import Channel from '#models/channel/channelModel.js';
import Message from '#models/messages/messagesModel.js';
import ChannelUser from '#models/channelUser/channelUserModel.js';
import Employee from '#models/authModels/employeeModel.js';
import { fetchMessages, handleError } from './utils.js';

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
      attachments = [],
    }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(channelId)) {
          throw new Error('Invalid Channel ID');
        }

        const channelUser = await ChannelUser.findOne({ channelId, userId });
        if (!channelUser) {
          throw new Error('You are not a member of this channel');
        }

        const user = await Employee.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        const message = new Message({
          channelId,
          senderId: userId,
          senderImage : user.dp,
          senderName: user.name,
          content,
          messageType,
          attachments,
        });

        await message.save();

        anthillChat.to(channelId).emit('receive_message', message);
        console.log(`Message sent in channel ${channelId} by ${userId}`);
      } catch (error) {
        handleError(socket, error, 'Failed to send the message');
      }
    },
  );
};
