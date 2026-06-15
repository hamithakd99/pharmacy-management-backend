import express from "express";
import { createProduct, deleteProduct, getAllProducts, getOneProduct, updateProduct } from "../controllers/productController";
import adminOnly from "../middlewares/adminMiddleware";

const productRouter = express.Router();

productRouter.post("/create", adminOnly, createProduct);
productRouter.get("/all", getAllProducts);
productRouter.get("/one/:id", getOneProduct);
productRouter.put("/update/:id", adminOnly, updateProduct);
productRouter.delete("/delete/:id", adminOnly, deleteProduct);

export default productRouter;