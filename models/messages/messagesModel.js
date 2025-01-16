import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Used for direct messages
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'file'],
      default: 'text',
    },
    attachments: {
      type: [String], // Array of file URLs
      default: [],
    },

    //if needed in v2
    // readBy: {
    //   type: [Schema.Types.ObjectId], // Array of user IDs who read the message
    //   ref: 'User',
    //   default: [],
    // },
  },
  {
    timestamps: true,
  },
);

export default model('Message', messageSchema);
