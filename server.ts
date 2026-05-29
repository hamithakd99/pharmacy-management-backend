import express from "express"
import userRouter from "./src/routes/authRoutes";
import { prisma } from "./lib/prisma";

const app = express()

app.use(express.json());

app.use("/user", userRouter)

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