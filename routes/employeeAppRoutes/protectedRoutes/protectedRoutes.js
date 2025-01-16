import { Router } from 'express'
import { manageEmployeeRoutes } from 'antopolis-express-utils/auth/manageEmployee/manageEmployeeRoutes.js'
import { sendEmployeeInvitationEmail } from '#config/email/emailFormats/sendEmail.js'

import Employee from '#models/authModels/employeeModel.js'
import EmployeeInvite from '#models/authModels/employeeInviteModel.js'

const models = {
    employee: Employee,
    employeeInvite: EmployeeInvite,
}

const protectedRoutes = Router()

protectedRoutes.use('/manageEmployees', manageEmployeeRoutes({ router : protectedRoutes, models, sendEmployeeInvitationEmail }))


export default protectedRoutes