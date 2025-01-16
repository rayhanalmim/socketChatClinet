import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const channelSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a channel name'],
    },
    description: {
      type: String,
      default: '',
    },
    isPrivate: {
      type: Boolean,
      default: false, // Public by default
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Channel must have a creator'],
    },
  },
  {
    timestamps: true,
  },
);

export default model('Channel', channelSchema);
