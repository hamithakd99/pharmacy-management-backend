import express from "express";
import { createPurchaseOrder, deletePurchaseOrder, getPurchaseOrderById, getPurchaseOrders, updatePurchaseOrder } from "../controllers/purchaseOrder";


const purchaseOrderRouter = express.Router();

purchaseOrderRouter.post("/create", createPurchaseOrder);
purchaseOrderRouter.get("/all", getPurchaseOrders);
purchaseOrderRouter.get("/purchase-orders/:id", getPurchaseOrderById);
purchaseOrderRouter.put("/update/purchase-orders/:id", updatePurchaseOrder);
purchaseOrderRouter.delete("/purchase-orders/:id", deletePurchaseOrder);

export default purchaseOrderRouter;