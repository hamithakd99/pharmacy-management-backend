import express from "express";
import { createNewBatch, getStockBatches, getStockBatchById, updateStockBatch, createBulkOpeningStock } from "../controllers/stock.batch.controller";

const stockBatchRouter = express.Router();

stockBatchRouter.post("/create", createNewBatch);
stockBatchRouter.get("/", getStockBatches);
stockBatchRouter.get("/:batchNumber", getStockBatchById);
stockBatchRouter.put("/:batchNumber", updateStockBatch);
stockBatchRouter.post("/opening-stock/bulk", createBulkOpeningStock);

export default stockBatchRouter;