import { Router } from 'express';
import { createChannel, getAllChannels, getChannelByUserId, getChannelUsers, inviteChannel,  } from '#controllers/channelController/channelController.js';

const channelRoutes = Router();

channelRoutes.route('/createChannel').post(createChannel);
channelRoutes.route('/channels').get(getAllChannels);
channelRoutes.route('/getChannelsByUserID/:id').get(getChannelByUserId);
channelRoutes.route('/addChannelMember').post(inviteChannel);
channelRoutes.route('/getChannelMember/:channelId').get(getChannelUsers);


export default channelRoutes;
