import express from "express";
import { createCategory, deleteCategory, getAllCategories, getOneCategory, updateCategory } from "../controllers/categoryController";

const categoryRouter = express.Router();

categoryRouter.post("/create", createCategory);
categoryRouter.get("/all", getAllCategories);
categoryRouter.get("/one/:id", getOneCategory);
categoryRouter.put("/update/:id", updateCategory);
categoryRouter.delete("/delete/:id", deleteCategory);

export default categoryRouter;