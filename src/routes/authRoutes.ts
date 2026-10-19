import express from "express";
import { loginUser, refreshAccessToken } from "../controllers/authController";

const authRouter = express.Router();

authRouter.post("/login", loginUser);
authRouter.post("/refresh", refreshAccessToken);

export default authRouter;