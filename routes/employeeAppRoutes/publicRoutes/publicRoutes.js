import { Router } from 'express';
import { authRoutes } from 'antopolis-express-utils/auth/authRoutes.js';
import { sendForgotPasswordMail } from '#config/email/emailFormats/sendClientContactForgotPasswordMail.js';
import Employee from '#models/authModels/employeeModel.js';
import EmployeeInvite from '#models/authModels/employeeInviteModel.js';
import channelUserRoutes from '#routes/channelUserRoutes/channelUserRoutes.js';
import channelRoutes from '#routes/channelRoutes/channelRoutes.js';

const models = {
  employee: Employee,
  employeeInvite: EmployeeInvite,
};

const publicRoutes = Router();

publicRoutes.use(
  '/auth',
  authRoutes({
    router: publicRoutes,
    models,
    sendForgotPasswordMail,
    folderName: 'projectName/employee',
  }),
);

publicRoutes.use('/channelUser', channelUserRoutes);
publicRoutes.use('/channel', channelRoutes);

export default publicRoutes;
