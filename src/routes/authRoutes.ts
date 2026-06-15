import express from "express"
import { createUser, getAllUsers, loginUser, deleteUser, updateUser, getOneUser } from "../controllers/authController"
import adminOnly from "../middlewares/adminMiddleware";

const userRouter = express.Router()

userRouter.post("/register", adminOnly, createUser);
userRouter.post("/login", loginUser);
userRouter.get("/", getAllUsers);
userRouter.get("/:id", getOneUser);
userRouter.delete("/delete/:id", adminOnly, deleteUser);
userRouter.put("/update/:id", adminOnly, updateUser);

export default userRouter;