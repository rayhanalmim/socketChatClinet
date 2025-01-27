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
  let currentConversationId = null;

  socket.on('join_dm', async ({ conversationId, userId }) => {
    try {
      if (!conversationId || !userId) {
        throw new Error('Conversation ID and User ID are required');
      }

      // If the user is already in a conversation, leave the previous one
      if (currentConversationId && currentConversationId !== conversationId) {
        socket.leave(currentConversationId);
      }

      socket.join(conversationId);
      currentConversationId = conversationId;

      // Reset unread count when joining conversation
      const conversationInfoKey = `conversation:${conversationId}:info`;
      await redisClient.hset(conversationInfoKey, userId, '0');

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

        // Store last message and unread count in Redis
        const conversationInfoKey = `conversation:${conversationId}:info`;
        const lastMessageTime = new Date().toISOString();

        // Update last message info for all users
        await redisClient.hset(conversationInfoKey, 'last_message', content);
        await redisClient.hset(
          conversationInfoKey,
          'last_message_time',
          lastMessageTime,
        );

        // Emit last message update to all users
        anthillChat.emit('unread_counts', {
          conversationId,
          count: 0,
          lastMessage: content,
          lastMessageTime,
          isChannel: false,
          senderId
        });

        // Check if recipient is in the conversation
        const recipientSocket = Array.from(await anthillChat.in(conversationId).allSockets());
        const isRecipientInConversation = recipientSocket.some(socketId => 
          anthillChat.sockets.get(socketId)?.rooms.has(`user:${recipientId}`)
        );

        // Only increment unread count if recipient is not in the conversation
        if (!isRecipientInConversation) {
          await redisClient.hincrby(conversationInfoKey, recipientId, 1);
          const unreadCount = await redisClient.hget(
            conversationInfoKey,
            recipientId,
          );

          const recipientRoom = `user:${recipientId}`;
          anthillChat.to(recipientRoom).emit('unread_counts', {
            conversationId,
            count: parseInt(unreadCount, 10),
            lastMessage: content,
            lastMessageTime,
            isChannel: false,
            senderId
          });
        }

        anthillChat.to(conversationId).emit('recived_dm', message);
      } catch (error) {
        handleError(socket, error, 'Failed to send the direct message');
      }
    },
  );

  socket.on('leave_dm', ({ conversationId }) => {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      socket.leave(conversationId);
      currentConversationId = null;

      console.log(`User has left the conversation: ${conversationId}`);
    } catch (error) {
      handleError(socket, error, 'Failed to leave the private conversation');
    }
  });
};
