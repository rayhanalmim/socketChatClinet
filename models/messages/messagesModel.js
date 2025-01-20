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
    senderName : {
      type: String,
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
  },
  {
    timestamps: true,
  },
);

export default model('Message', messageSchema);
