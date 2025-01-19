import Channel from '#models/channel/channelModel.js';
import Message from '#models/messages/messagesModel.js';
import ChannelUser from '#models/channelUser/channelUserModel.js';


const socketHandler = (io) => {
  const anthillChat = io.of('/anthillChat'); // Create a namespace

  anthillChat.on('connection', (socket) => {
    console.log(`User connected to anthillChat namespace: ${socket.id}`);

    /**
     * Join a Channel
     */
    socket.on('join_channel', async ({ channelId }) => {
      try {
        console.log("hitttttttttttttttt")
        const channel = await Channel.findById(channelId);

        if (!channel) {
          socket.emit('error', 'Channel not found');
          return;
        }

        const channelUser = await ChannelUser.findOne({
          channelId,
          userId: socket.userId,
        });

        if (!channelUser) {
          socket.emit('error', 'You are not a member of this channel');
          return;
        }

        socket.join(channelId);
        console.log(`User ${socket.userId} joined channel ${channelId}`);

        // Fetch last 50 messages
        const messages = await Message.find({ channelId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('senderId', 'username avatar');

        socket.emit('message_history', messages);
        anthillChat.to(channelId).emit('user_joined', {
          userId: socket.userId,
          username: socket.username,
        });
      } catch (error) {
        console.error('Error joining channel:', error.message);
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
        messageType = 'text',
        attachments = [],
      }) => {
        try {
          const channelUser = await ChannelUser.findOne({
            channelId,
            userId: socket.userId,
          });

          if (!channelUser) {
            socket.emit('error', 'You are not a member of this channel');
            return;
          }

          const message = new Message({
            channelId,
            senderId: socket.userId,
            content,
            messageType,
            attachments,
          });

        

          anthillChat.to(channelId).emit('receive_message', message);
          console.log(
            `Message sent in channel ${channelId} by user ${socket.userId}`,
          );
        } catch (error) {
          console.error('Error sending message:', error.message);
        }
      },
    );

    /**
     * Typing Indicator
     */
    socket.on('typing', ({ channelId }) => {
      socket.to(channelId).emit('typing', { userId: socket.userId });
    });

    socket.on('stop_typing', ({ channelId }) => {
      socket.to(channelId).emit('stop_typing', { userId: socket.userId });
    });

    /**
     * Private Messaging (Direct Message)
     */
    socket.on('private_message', async ({ recipientId, content }) => {
      try {
        const message = new Message({
          senderId: socket.userId,
          recipientId,
          content,
          messageType: 'text',
        });

        await message.save();
        const populatedMessage = await message.populate('senderId', 'name');

        anthillChat.to(recipientId).emit('private_message', populatedMessage);
        console.log(`DM sent to user ${recipientId} by user ${socket.userId}`);
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
