import express from "express";
import { createCategory, deleteCategory, getAllCategories, getOneCategory, updateCategory } from "../controllers/categoryController";
import adminOnly from "../middlewares/adminMiddleware";
const categoryRouter = express.Router();

categoryRouter.post("/create", adminOnly, createCategory);
categoryRouter.get("/all", getAllCategories);
categoryRouter.get("/one/:id", getOneCategory);
categoryRouter.put("/update/:id", adminOnly, updateCategory);
categoryRouter.delete("/delete/:id", adminOnly, deleteCategory);

export default categoryRouter;