import express from "express";
import { cancelPurchaseOrder, createPurchaseOrder, getPurchaseOrderById, getPurchaseOrders, updatePurchaseOrder } from "../controllers/purchaseOrder";


const purchaseOrderRouter = express.Router();

purchaseOrderRouter.post("/create", createPurchaseOrder);
purchaseOrderRouter.get("/all", getPurchaseOrders);
purchaseOrderRouter.get("/purchase-orders/:id", getPurchaseOrderById);
purchaseOrderRouter.put("/update/purchase-orders/:id", updatePurchaseOrder);
purchaseOrderRouter.patch("/purchase-orders/:id/cancel", cancelPurchaseOrder);

export default purchaseOrderRouter;