import mongoose from 'mongoose';
import Message from '#models/messages/messagesModel.js';
import redisClient from '../redisClient.js';

export const createConversationId = (user1, user2) =>
  [user1, user2].sort().join('_');

export const fetchMessages = async (filter, limit = 50) => {
  const cacheKey = JSON.stringify(filter);
  const cachedMessages = await redisClient.get(cacheKey);

  if (cachedMessages) {
    console.log('redis message');
    return JSON.parse(cachedMessages);
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);
  await redisClient.set(cacheKey, JSON.stringify(messages), 'EX', 60 * 5); // Cache for 5 minutes

  return messages;
};

export const updateCache = async (filter, newMessage, limit = 50) => {
  console.log('updating cache');
  const cacheKey = JSON.stringify(filter);
  const cachedMessages = await redisClient.get(cacheKey);

  let messages = cachedMessages ? JSON.parse(cachedMessages) : [];
  messages.unshift(newMessage); // Add new message to the beginning

  if (messages.length > limit) {
    messages.pop(); // Remove the oldest message if cache size exceeds limit
  }

  await redisClient.set(cacheKey, JSON.stringify(messages), 'EX', 60 * 5); // Cache for 5 minutes
};

export const handleError = (socket, error, clientMessage) => {
  console.error(clientMessage, error);
  socket.emit('error', clientMessage);
};

export const handleUtilityEvents = (socket, anthillChat) => {
  // socket.on('add_reaction', async ({ messageId, reaction, userId }) => {
  //   try {
  //     if (!mongoose.Types.ObjectId.isValid(messageId)) {
  //       throw new Error('Invalid Message ID');
  //     }

  //     const message = await Message.findById(messageId);
  //     if (!message) {
  //       throw new Error('Message not found');
  //     }

  //     const existingReaction = message.reactions.find(
  //       (r) => r.userId.toString() === userId && r.reaction === reaction,
  //     );

  //     if (existingReaction) {
  //       message.reactions = message.reactions.filter(
  //         (r) => !(r.userId.toString() === userId && r.reaction === reaction),
  //       );
  //     } else {
  //       message.reactions.push({ userId, reaction });
  //     }

  //     await message.save();

  //     anthillChat.to(message.channelId).emit('reaction_updated', {
  //       messageId,
  //       reactions: message.reactions,
  //     });
  //   } catch (error) {
  //     handleError(socket, error, 'Failed to add reaction to the message');
  //   }
  // });

  socket.on('edit_message', async ({ messageId, newContent, userId, channelId, conversationId }) => {
    try {
      // Validate messageId
      if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error('Invalid Message ID');
      }
  
      // Find message using both channelId and conversationId
      const query = {
        _id: messageId,
        ...(channelId ? { channelId } : {}),
        ...(conversationId ? { conversationId } : {})
      };
  
      const message = await Message.findOne(query);
      
      if (!message) {
        throw new Error('Message not found');
      }
  
      if (message.senderId.toString() !== userId) {
        throw new Error('Unauthorized: You can only edit your own messages');
      }
  
      const oneHour = 60 * 60 * 1000;
      if (new Date() - new Date(message.createdAt) > oneHour) {
        throw new Error('You cannot edit messages older than 1 hour');
      }
  
      message.content = newContent;
      message.edited = true;
      await message.save();
  
      // Update Redis cache
      const filter = channelId ? { channelId } : { conversationId };
      const cacheKey = JSON.stringify(filter);
      const cachedMessages = await redisClient.get(cacheKey);
  
      if (cachedMessages) {
        const messages = JSON.parse(cachedMessages);
        const updatedMessages = messages.map(msg => 
          msg._id === messageId ? { ...msg, content: newContent, edited: true } : msg
        );
        await redisClient.set(cacheKey, JSON.stringify(updatedMessages), 'EX', 60 * 5);
      }
  
      // Emit to the appropriate room
      const room = channelId || conversationId;
      anthillChat.to(room).emit('message_edited', {
        messageId,
        newContent,
        edited: true
      });
  
    } catch (error) {
      handleError(socket, error, 'Failed to edit the message');
    }
  });
};
