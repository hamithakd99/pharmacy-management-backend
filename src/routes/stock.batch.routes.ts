import express from "express";
import { createNewBatch, getStockBatches, getStockBatchById, updateStockBatch } from "../controllers/stock.batch.controller";

const stockBatchRouter = express.Router();

stockBatchRouter.post("/create", createNewBatch);
stockBatchRouter.get("/", getStockBatches);
stockBatchRouter.get("/:batchNumber", getStockBatchById);
stockBatchRouter.put("/:batchNumber", updateStockBatch);

export default stockBatchRouter;