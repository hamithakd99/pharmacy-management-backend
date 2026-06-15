import express from "express"
import { createUser, deleteExternalUser, getAllExternalUsers, getCustomers, getoneExternalUser, getSuppliers, updateExternalUser } from "../controllers/external.user.controller";
import adminOnly from "../middlewares/adminMiddleware";

const externalUserRouter = express.Router()

externalUserRouter.post("/register", adminOnly, createUser);
externalUserRouter.get("/customers", getCustomers);
externalUserRouter.get("/suppliers", getSuppliers);
externalUserRouter.get("/all-external-users", getAllExternalUsers);
externalUserRouter.get("/user/:id", getoneExternalUser);
externalUserRouter.put("/update/:id", adminOnly, updateExternalUser);
externalUserRouter.delete("/delete/:id", adminOnly, deleteExternalUser);

export default externalUserRouter;