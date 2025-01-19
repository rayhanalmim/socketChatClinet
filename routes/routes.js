import { Router } from 'express';

import employeeAppRoutes from './employeeAppRoutes/employeeAppRoutes.js';
import publicRoutes from './employeeAppRoutes/publicRoutes/publicRoutes.js';
import channelRoutes from './channelRoutes/channelRoutes.js';

const routes = Router();

routes.use('/employeeApp', employeeAppRoutes);
routes.use('/public', publicRoutes);
routes.use('/channel', channelRoutes)


export default routes;
