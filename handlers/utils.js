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
    const messages = JSON.parse(cachedMessages);

    // Ensure that each message includes its reactions
    for (let msg of messages) {
      const reactions = await getReactions(msg._id); // Fetch reactions for the message
      msg.reactions = reactions;  // Attach reactions to the message
    }

    return messages;
  }

  // Fetch messages from the database if not in cache
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);

  // Fetch reactions for each message from the database
  for (let msg of messages) {
    const reactions = await getReactions(msg._id);
    msg.reactions = reactions;  // Attach reactions to the message
  }

  // Cache the messages with reactions for 5 minutes
  await redisClient.set(cacheKey, JSON.stringify(messages), 'EX', 60 * 5);

  return messages;
};




export const updateCache = async (filter, newMessage, limit = 50) => {
  console.log('updating cache');
  const cacheKey = JSON.stringify(filter);
  const cachedMessages = await redisClient.get(cacheKey);

  let messages = cachedMessages ? JSON.parse(cachedMessages) : [];

  // Fetch reactions for the new message and add them
  const reactions = await getReactions(newMessage._id); // Fetch reactions for the new message
  newMessage.reactions = reactions;  // Attach reactions to the new message

  messages.unshift(newMessage); // Add the new message to the beginning

  if (messages.length > limit) {
    messages.pop(); // Remove the oldest message if cache size exceeds limit
  }

  // Update the cache with the new message and its reactions
  await redisClient.set(cacheKey, JSON.stringify(messages), 'EX', 60 * 5); // Cache for 5 minutes
};


const getReactions = async (messageId) => {
  // Fetch reactions for the message (assuming they're stored in a separate collection)
  const message = await Message.findById(messageId);
  return message ? message.reactions : [];
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

  socket.on("mark_message_seen", async ({ channelId, userId, messageId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(channelId) || !mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid Channel ID or Message ID");
      }
  
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error("Message not found");
      }
  
      // Add user to seenBy array if not already there
      if (!message.seenBy.includes(userId)) {
        message.seenBy.push(userId);
        await message.save();
  
        // Update Redis
        const messageSeenKey = `message:${messageId}:seenBy`;
        await redisClient.sadd(messageSeenKey, userId);
  
        // Fetch seen user details
        const seenUsers = await Employee.find({ _id: { $in: message.seenBy } }, "name _id");
  
        // Emit seen update to all members in the channel
        anthillChat.to(channelId).emit("message_seen_update", {
          messageId,
          seenUsers,
        });
      }
    } catch (error) {
      handleError(socket, error, "Failed to mark message as seen");
    }
  });
  
};
