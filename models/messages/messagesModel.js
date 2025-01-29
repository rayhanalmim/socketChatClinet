import mongoose from "mongoose";
const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    // For channel messages
    channelId: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      index: true, // Indexed for faster querying
    },
    // Sender information
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },
    senderName: {
      type: String,
    },
    senderImage: {
      type: String,
    },
    // For direct messages
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // For direct messages and replies
    conversationId: {
      type: String,
      index: true,
    },

    // Message content and type
    content: {
      type: String,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text",
    },
    attachment: {
      type: String,
    },
    reactions: {
      type: [
        {
          userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          reaction: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
    // Seen by users
    seenBy: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Compound indexes for optimized queries
messageSchema.index({ channelId: 1, createdAt: -1 }); // For channel messages
messageSchema.index({ conversationId: 1, createdAt: -1 }); // For direct messages
messageSchema.index({ 'reactions.userId': 1, 'reactions.reaction': 1 });
messageSchema.index({ seenBy: 1 });


export default model("Message", messageSchema);
