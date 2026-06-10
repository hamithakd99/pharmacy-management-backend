import express from "express"
import { createUser, getAllUsers, loginUser, deleteUser, updateUser } from "../controllers/authController"

const userRouter = express.Router()

userRouter.post("/register", createUser);
userRouter.post("/login", loginUser);
userRouter.get("/", getAllUsers);
userRouter.delete("/delete/:id", deleteUser);
userRouter.put("/update/:id", updateUser);

export default userRouter;