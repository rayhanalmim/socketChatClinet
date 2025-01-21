import mongoose from 'mongoose';
import Message from '#models/messages/messagesModel.js';
import { createConversationId, fetchMessages, handleError } from './utils.js';

export const handleDMEvents = (socket, anthillChat) => {
  socket.on('join_dm', async ({ senderId, recipientId }) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(senderId) ||
        !mongoose.Types.ObjectId.isValid(recipientId)
      ) {
        throw new Error('Invalid user IDs');
      }

      const conversationId = createConversationId(senderId, recipientId);

      socket.join(conversationId);

      const messages = await fetchMessages({ conversationId });
      socket.emit('private_message_history', messages);
    } catch (error) {
      handleError(socket, error, 'Failed to join the private conversation');
    }
  });

  socket.on('send_dm', async ({ senderId, recipientId, content }) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(senderId) ||
        !mongoose.Types.ObjectId.isValid(recipientId)
      ) {
        throw new Error('Invalid user IDs');
      }

      const conversationId = createConversationId(senderId, recipientId);

      const message = new Message({
        senderId,
        recipientId,
        content,
        messageType: 'text',
        conversationId,
      });

      await message.save();
      const populatedMessage = await message.populate('senderId');

      anthillChat.to(conversationId).emit('send_dm', populatedMessage);
    } catch (error) {
      handleError(socket, error, 'Failed to send the direct message');
    }
  });
};
