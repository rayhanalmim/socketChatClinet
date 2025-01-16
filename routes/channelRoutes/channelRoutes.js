import { Router } from 'express';
import { getChannelByUserId } from '#controllers/channelController/channelController.js';

const channelRoutes = Router();

channelRoutes.route('/getChannelsByUserID/:id').get(getChannelByUserId);

export default channelRoutes;
