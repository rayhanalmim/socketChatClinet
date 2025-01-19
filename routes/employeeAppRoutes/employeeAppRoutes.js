import { Router } from 'express'

import publicRoutes from './publicRoutes/publicRoutes.js'
import protectedRoutes from './protectedRoutes/protectedRoutes.js'
import { protectForEmployee } from '#middlewares/authMiddleware.js'
import { searchEmployee } from '#controllers/EmployeeController/employeeController.js'

const employeeAppRoutes = Router()

employeeAppRoutes.use('/public', publicRoutes)
employeeAppRoutes.use('/protected', protectForEmployee, protectedRoutes)
employeeAppRoutes.route('/search').get(searchEmployee)

export default employeeAppRoutes