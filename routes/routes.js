import { Router } from 'express';

import employeeAppRoutes from './employeeAppRoutes/employeeAppRoutes.js';
import publicRoutes from './employeeAppRoutes/publicRoutes/publicRoutes.js';

const routes = Router();

routes.use('/employeeApp', employeeAppRoutes);
routes.use('/public', publicRoutes);

export default routes;
