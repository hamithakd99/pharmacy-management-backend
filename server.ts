import express from "express"
import userRouter from "./src/routes/authRoutes";
import { prisma } from "./lib/prisma";
import jwt from "jsonwebtoken"

const app = express()

app.use(express.json());

app.use((req, res, next) => {
    const tokenString = req.header("Authentication");
    if (tokenString != null) {
        const token = tokenString.replace("Bearer ", "");
        console.log("Received token:", token);

        jwt.verify(token, process.env.JWT_SECRET!,
            (err, decoded) => {
                if(decoded != null) {
                    console.log("Decoded token:", decoded);
                    (req as any).user = decoded;
                    next();
                }
                else {
                    console.log("Invalid Token")
                    res.status(401).json({
                        message : "Invalid Token"
                    })
                }
            }
        )
    } else {
        next();
    }

})

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