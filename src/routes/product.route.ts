import express from "express";
import { activeProducts, createProduct, deleteProduct, getAllProducts, getOneProduct, getProductDetails, inactiveProducts, updateProduct } from "../controllers/productController";


const productRouter = express.Router();

productRouter.post("/create", createProduct);
productRouter.get("/all", getAllProducts);
productRouter.get("/one/:id", getOneProduct);
productRouter.put("/update/:id", updateProduct);
productRouter.delete("/delete/:id", deleteProduct);
productRouter.get("/inactive", inactiveProducts);
productRouter.get("/active", activeProducts);
productRouter.get("/view/:id", getProductDetails);


export default productRouter;