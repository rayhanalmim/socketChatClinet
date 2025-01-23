import mongoose from 'mongoose';
import Message from '#models/messages/messagesModel.js';
import { createConversationId, fetchMessages, handleError, updateCache } from './utils.js';
import { uploadObject } from '#config/space.js';
import Employee from '#models/authModels/employeeModel.js';
import redisClient from '../redisClient.js'; // Import redisClient

export const handleDMEvents = (socket, anthillChat) => {
  socket.on('join_dm', async ({ conversationId }) => {
    try {
      socket.join(conversationId);

      console.log('user joined dm', conversationId);
      const messages = await fetchMessages({ conversationId });
      console.log('messages', messages);
      socket.emit('private_message_history', messages);
    } catch (error) {
      handleError(socket, error, 'Failed to join the private conversation');
    }
  });

  socket.on(
    'send_dm',
    async ({ senderId, recipientId, content, attachment, messageType }) => {
      try {
        if (
          !mongoose.Types.ObjectId.isValid(senderId) ||
          !mongoose.Types.ObjectId.isValid(recipientId)
        ) {
          throw new Error('Invalid user IDs');
        }
        const conversationId = createConversationId(senderId, recipientId);

        let attachmentUrl = null;
        if (attachment && messageType !== 'text') {
          const filePath = `antschat/${Date.now()}-${attachment.name}`;

          await uploadObject(filePath, attachment.data);

          attachmentUrl = filePath;
        }

        const user = await Employee.findById(senderId);

        // Create and save the message
        const message = new Message({
          senderId,
          senderName: user.name,
          senderImage: user.dp,
          recipientId,
          content,
          messageType,
          conversationId,
          attachment: attachmentUrl, // Save the file URL (or null if no attachment)
        });

        await message.save();

        // Update cache
        await updateCache({ conversationId }, message);

        // Increment unread message count for the recipient
        await redisClient.hincrby(`unread:${conversationId}`, recipientId, 1);
        const unreadCount = await redisClient.hget(`unread:${conversationId}`, recipientId);
        anthillChat.to(recipientId).emit('unread_count', { conversationId, count: unreadCount });

        anthillChat.to(conversationId).emit('recived_dm', message);
      } catch (error) {
        console.log(error);
        handleError(socket, error, 'Failed to send the direct message');
      }
    },
  );
};
