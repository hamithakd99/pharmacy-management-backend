import express from "express"
import userRouter from "./src/routes/authRoutes";
import { prisma } from "./lib/prisma";
import externalUserRouter from "./src/routes/external.user.route";
import authMiddleware from "./src/middlewares/authMiddleware";
import productRouter from "./src/routes/product.route";
import categoryRouter from "./src/routes/category.routes";
import cors from "cors";
import stockBatchRouter from "./src/routes/stock.batch.routes";

const app = express();

app.use(cors())
app.use(express.json());

//authentication
app.use(authMiddleware);

app.use("/user", userRouter)
app.use("/external", externalUserRouter)
app.use("/product", productRouter)
app.use("/category", categoryRouter)
app.use("/stock-batch", stockBatchRouter)

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