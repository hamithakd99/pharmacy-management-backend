import express from "express"
import { allOrders, cancelOrder, createOrder, getOrderById, updateOrderPayment, } from "./order.controller"

const orderRouter = express.Router()

orderRouter.post("/", createOrder)
orderRouter.get("/", allOrders)
orderRouter.get("/:id", getOrderById)
orderRouter.patch("/:id/payment", updateOrderPayment)
orderRouter.put("/:id/cancel", cancelOrder)

// orderRouter.get("/customer/:id", createOrder)
// orderRouter.get("/product/:id", createOrder)
// orderRouter.get("/date", createOrder)
// orderRouter.get("/:id/invoice", createOrder)

export default orderRouter