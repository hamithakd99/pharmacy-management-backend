import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { prisma } from "./lib/prisma";

import externalUserRouter from "./src/routes/external.user.route";

import authMiddleware from "./src/middlewares/authMiddleware";

import productRouter from "./src/routes/product.route";
import categoryRouter from "./src/routes/category.routes";
import stockBatchRouter from "./src/routes/stock.batch.routes";
import purchaseOrderRouter from "./src/routes/purchaseOrder.routes";
import orderRouter from "./src/modules/order/order.routes";
import userRouter from "./src/routes/user.routes";
import authRouter from "./src/routes/authRoutes";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/user", authRouter);

app.use(authMiddleware);

app.use("/user", userRouter);
app.use("/external", externalUserRouter);
app.use("/product", productRouter);
app.use("/category", categoryRouter);
app.use("/stock-batch", stockBatchRouter);
app.use("/po", purchaseOrderRouter);
app.use("/order", orderRouter);

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Connected to the database successfully.");

    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();

export default app;