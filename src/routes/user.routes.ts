import express from "express";

import {
  createUser,
  getAllUsers,
  deleteUser,
  updateUser,
  getOneUser,
} from "../controllers/authController";
import requireRole from "../middlewares/roleMiddleware";
import { Role } from "../../generated/prisma/browser";

const userRouter = express.Router();

userRouter.post("/register", requireRole(Role.ADMIN), createUser);
userRouter.get("/", requireRole(Role.ADMIN), getAllUsers);
userRouter.get("/:id", requireRole(Role.ADMIN), getOneUser);
userRouter.delete("/delete/:id", requireRole(Role.ADMIN), deleteUser);
userRouter.put("/update/:id", requireRole(Role.ADMIN), updateUser);

export default userRouter;