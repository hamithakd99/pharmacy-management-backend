import express from "express"
import userRouter from "./src/routes/authRoutes";
import { prisma } from "./lib/prisma";
import externalUserRouter from "./src/routes/external.user.route";
import authMiddleware from "./src/middlewares/authMiddleware";

const app = express()

app.use(express.json());

//authentication
app.use(authMiddleware);

app.use("/user", userRouter)
app.use("/external", externalUserRouter)

async function startServer() {
    try {
        await prisma.$connect();
        console.log("Connected to the database successfully.");   
        
        app.listen(3000, ()=> {
            console.log("Server is running on port 3000");
        })
    } catch (error) {
        console.error("Error starting the server:", error);
    }
}

startServer()