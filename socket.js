import Channel from '#models/channel/channelModel.js';
import Message from '#models/messages/messagesModel.js';
import ChannelUser from '#models/channelUser/channelUserModel.js';
import Employee from '#models/authModels/employeeModel.js';

const socketHandler = (io) => {
  const anthillChat = io.of('/anthillChat'); // Create a namespace

  anthillChat.on('connection', (socket) => {
    console.log(`User connected to anthillChat namespace: ${socket.id}`);

    /**
     * Join a Channel
     */
    // Join a channel
    socket.on('join_channel', async ({ channelId, userId }) => {
      try {
        // Leave previous channel if user was in one
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });

        // Fetch the channel and membership info
        const channel = await Channel.findById(channelId);
        if (!channel) {
          socket.emit('error', 'Channel not found');
          return;
        }

        const channelUser = await ChannelUser.findOne({ channelId, userId });
        if (!channelUser) {
          socket.emit('error', 'You are not a member of this channel');
          return;
        }

        // Join the new channel
        socket.join(channelId);
        console.log(`User ${userId} joined channel ${channelId}`);

        // Send message history
        const messages = await Message.find({ channelId })
          .sort({ createdAt: -1 })
          .limit(50);
        // .select('senderId content messageType createdAt');

        socket.emit('message_history', messages);

        // Notify others
        anthillChat
          .to(channelId)
          .emit('user_joined', { userId, username: channelUser.username });
      } catch (error) {
        console.error('Error joining channel:', error.message);
      }
    });

    /**
     * Leave a Channel
     */
    socket.on('leave_channel', async ({ channelId, userId }) => {
      try {

        // Remove the user from the socket room
        socket.leave(channelId);

        // Notify other users in the channel about the user leaving
        anthillChat.to(channelId).emit('user_left', {
          userId,
        });

        console.log(`User ${userId} left channel ${channelId}`);
      } catch (error) {
        console.error('Error leaving channel:', error);
      }
    });

    /**
     * Send a Message
     */
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
          console.log('Received message:', {
            channelId,
            content,
            userId,
            messageType,
            attachments,
          });

          // Verify if the user is part of the channel
          const channelUser = await ChannelUser.findOne({
            channelId,
            userId,
          });

          const user = await Employee.findById(userId);


          if (!channelUser) {
            socket.emit('error', 'You are not a member of this channel');
            return;
          }

          // Create a new message instance
          const message = new Message({
            channelId,
            senderId: userId,
            senderName: user.name,
            content,
            messageType,
            attachments,
          });

          // Save the message to the database
          await message.save();


          // Broadcast the message to the channel
          anthillChat.to(channelId).emit('receive_message', message);

          console.log(`Message sent in channel ${channelId} by ${userId}`);
        } catch (error) {
          console.error('Error sending message:', error.message);
        }
      },
    );

    /**
     * Typing Indicator
     */
    socket.on('typing', async ({ channelId, userId }) => {

      const user = await Employee.findById(userId);
      socket.to(channelId).emit('typing', { userId: userId, name: user.name });
   
    });

    socket.on('stop_typing', async ({ channelId, userId }) => {
      const user = await Employee.findById(userId);
      socket
        .to(channelId)
        .emit('stop_typing', { userId: userId, name: user.name });
    });

    /**
     * Private Messaging (Direct Message)
     */

    socket.on('join_dm', async ({ senderId, recipientId }) => {
      try {
        const conversationId = [senderId, recipientId].sort().join('_');

        socket.join(conversationId);
        console.log("user joined the dm", senderId, recipientId)

        const messages = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(50);
        // .select('senderName content messageType createdAt');

        socket.emit('private_message_history', messages);

        console.log(`User ${senderId} joined private conversation with ${recipientId}, messeges: ${messages}`);
      } catch (error) {
        console.error('Error joining private conversation:', error.message);
      }
    });

    socket.on('send_dm', async ({ senderId, recipientId, content }) => {
      try {
        const conversationId = [senderId, recipientId].sort().join('_');

        const message = new Message({
          senderId,
          recipientId,
          content,
          messageType: 'text',
          conversationId,
        });

        await message.save();

        anthillChat.to(conversationId).emit('recive_dm', message);
      } catch (error) {
        console.error('Error sending private message:', error.message);
      }
    });

    /**
     * Handle Disconnection
     */
    socket.on('disconnect', () => {
      console.log(`User disconnected from anthillChat namespace: ${socket.id}`);
    });
  });
};

export default socketHandler;
