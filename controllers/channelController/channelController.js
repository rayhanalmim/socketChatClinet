import asyncHandler from "express-async-handler";
import Channel from "#models/channel/channelModel.js";
import ChannelUser from "#models/channelUser/channelUserModel.js";

const createChannel = asyncHandler(async (req, res) => {
  const { name, description, isPrivate } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Channel name is required");
  }

  const channelExists = await Channel.findOne({ name });

  if (channelExists) {
    res.status(400);
    throw new Error("Channel already exists");
  }

  const channel = await Channel.create({
    name,
    description,
    isPrivate,
  });

  if (channel) {
    res.status(201).json({
      _id: channel._id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.isPrivate,
    });
  } else {
    res.status(400);
    throw new Error("Invalid channel data");
  }
});

const getAllChannels = asyncHandler(async (req, res) => {
  // Optionally, you can use query parameters for filtering, but we'll default to active channels
  const channels = await Channel.find({ isActive: true });

  if (!channels || channels.length === 0) {
    res.status(404).json({ message: "No active channels found" });
  } else {
    res.status(200).json(channels);
  }
});

const getChannels = asyncHandler(async (req, res) => {
  const { filter, search } = req.query;

  let query = {};

  if (filter === "active") {
    query.isActive = true;
  } else if (filter === "archived") {
    query.isActive = false;
  }

  if (search) {
    query.name = { $regex: new RegExp(search, "i") };
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
    throw new Error("Channel not found");
  }
});

const getChannelByUserId = asyncHandler(async (req, res) => {
  const channel = await Channel.findOne({ user: req.params.id });
  if (channel) {
    res.json(channel);
  } else {
    res.status(404);
    throw new Error("Channel not found");
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
    throw new Error("Channel not found");
  }
});

const inviteChannel = asyncHandler(async (req, res) => {
  try {
    const { channelId, cmsUser } = req.body;

    // Validate required fields
    if (!channelId || !cmsUser) {
      return res
        .status(400)
        .json({ message: "Channel ID and User ID are required" });
    }

    // Check if the combination of channelId and userId already exists
    const existingChannelUser = await ChannelUser.findOne({
      channelId,
      userId: cmsUser,
    });

    if (existingChannelUser) {
      return res
        .status(409)
        .json({ message: "This user is already added to the channel" });
    }

    // Create and save the new channel user
    const newChannelUser = new ChannelUser({
      channelId,
      userId: cmsUser,
    });

    await newChannelUser.save();

    res.status(201).json({
      message: "User added to channel successfully",
      data: newChannelUser,
    });
  } catch (error) {
    console.error("Error adding user to channel:", error);
    res
      .status(500)
      .json({
        message: "An error occurred while adding user to channel",
        error,
      });
  }
});

// Fetch channels the user has joined
const getChannelUsers = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(userId)

    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    // Find all channel IDs where the user has joined
    const joinedChannels = await ChannelUser.find({ userId }).select('channelId');

    if (!joinedChannels.length) {
      res.status(200).json([]); // Return empty array if user hasn't joined any channels
      return;
    }

    const channelIds = joinedChannels.map((entry) => entry.channelId);

    // Fetch the channel details based on the channel IDs
    const channels = await Channel.find({ _id: { $in: channelIds } });

    res.status(200).json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching channels', error: error.message });
  }
});

export {
  createChannel,
  getAllChannels,
  getChannels,
  getChannelById,
  updateChannel,
  getChannelByUserId,
  inviteChannel,
  getChannelUsers
};
