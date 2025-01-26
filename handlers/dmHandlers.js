/* eslint-disable no-undef */
import mongoose from 'mongoose';
import Message from '#models/messages/messagesModel.js';
import {
  createConversationId,
  fetchMessages,
  handleError,
  updateCache,
} from './utils.js';
import { uploadBuffer } from '#config/space.js';
import Employee from '#models/authModels/employeeModel.js';
import redisClient from './../redisClient.js';

export const handleDMEvents = (socket, anthillChat) => {
  socket.on('join_dm', async ({ conversationId }) => {
    try {
      socket.join(conversationId);

      const messages = await fetchMessages({ conversationId });
      socket.emit('private_message_history', messages);
    } catch (error) {
      handleError(socket, error, 'Failed to join the private conversation');
    }
  });

  socket.on(
    'send_dm',
    async ({ senderId, recipientId, content, attachmentData, messageType }) => {
      try {
        if (
          !mongoose.Types.ObjectId.isValid(senderId) ||
          !mongoose.Types.ObjectId.isValid(recipientId)
        ) {
          throw new Error('Invalid user IDs');
        }

        const conversationId = createConversationId(senderId, recipientId);
        let attachmentUrl = null;

        if (attachmentData?.attachment) {
          const buffer = Buffer.from(attachmentData.attachment.data, 'base64');
          const result = await uploadBuffer(
            attachmentData.filePath,
            buffer,
            attachmentData.attachment.mimetype,
          );
          attachmentUrl = result;
        }

        const user = await Employee.findById(senderId);
        if (!user) {
          throw new Error('Sender not found');
        }

        const message = new Message({
          senderId,
          senderName: user.name,
          senderImage: user.dp,
          recipientId,
          content,
          messageType,
          conversationId,
          attachment: attachmentUrl,
        });

        await message.save();
        await updateCache({ conversationId }, message);

        await redisClient.hincrby(`unread:${conversationId}`, recipientId, 1);
        const unreadCount = await redisClient.hget(
          `unread:${conversationId}`,
          recipientId,
        );
        anthillChat
          .to(recipientId)
          .emit('unread_count', { conversationId, count: unreadCount });

        // Store last message and time in Redis for the DM
        await redisClient.hset(
          `last_message:${conversationId}`,
          'message',
          content,
        );
        await redisClient.hset(
          `last_message:${conversationId}`,
          'time',
          new Date().toISOString(),
        );

        anthillChat.to(conversationId).emit('recived_dm', message);
      } catch (error) {
        console.error(error);
        handleError(socket, error, 'Failed to send the direct message');
      }
    },
  );
};
