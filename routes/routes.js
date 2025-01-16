import { Router } from "express"

import employeeAppRoutes from "./employeeAppRoutes/employeeAppRoutes.js"

const routes = Router()

routes.use('/employeeApp',  employeeAppRoutes)


export default routes