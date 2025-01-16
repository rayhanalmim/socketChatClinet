import asyncHandler from 'express-async-handler';
import Channel from '#models/channel/channelModel.js';

const createChannel = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Channel name is required');
  }

  const channelExists = await Channel.findOne({ name });

  if (channelExists) {
    res.status(400);
    throw new Error('Channel already exists');
  }

  const channel = await Channel.create({
    name,
    description,
  });

  if (channel) {
    res.status(201).json({
      _id: channel._id,
      name: channel.name,
      description: channel.description,
    });
  } else {
    res.status(400);
    throw new Error('Invalid channel data');
  }
});

const getChannels = asyncHandler(async (req, res) => {
  const { filter, search } = req.query;

  let query = {};

  if (filter === 'active') {
    query.isActive = true;
  } else if (filter === 'archived') {
    query.isActive = false;
  }

  if (search) {
    query.name = { $regex: new RegExp(search, 'i') };
  }
  const channels = await Channel.find(query);
  res.json(channels);
});

const getChannelById = asyncHandler(async (req, res) => {
  const channel = await Channel.findById(req.params.id);

  if (channel) {
    res.json(channel);
  } else {
    res.status(404);
    throw new Error('Channel not found');
  }
});

const updateChannel = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const channel = await Channel.findById(req.params.id);

  if (channel) {
    channel.name = name || channel.name;
    channel.description = description || channel.description;

    const updatedChannel = await channel.save();
    res.json({
      _id: updatedChannel._id,
      name: updatedChannel.name,
      description: updatedChannel.description,
    });
  } else {
    res.status(404);
    throw new Error('Channel not found');
  }
});

export { createChannel, getChannels, getChannelById, updateChannel };
