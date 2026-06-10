import express from "express"
import { createUser, deleteExternalUser, getCustomers, getSuppliers, updateExternalUser } from "../controllers/external.user.controller";

const externalUserRouter = express.Router()

externalUserRouter.post("/register", createUser);
externalUserRouter.get("/customers", getCustomers);
externalUserRouter.get("/suppliers", getSuppliers);
externalUserRouter.put("/update/:id", updateExternalUser);
externalUserRouter.delete("/delete/:id", deleteExternalUser);

export default externalUserRouter;