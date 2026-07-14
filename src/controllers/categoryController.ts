import type { Response ,Request } from "express";
import { prisma } from "../../lib/prisma";

export const createCategory =  async ( req : Request, res : Response
) => {
    try {
        const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({
        error: "Category name is required",
      });
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
      },
    });

    return res.status(201).json(newCategory);
    } catch (error) {
        console.error("Error creating category:", error);
        return res.status(500).json({ error: "Failed to create category" });
    }
}

export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const allCategories = await prisma.category.findMany();
        return res.status(200).json(allCategories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return res.status(500).json({ error: "Failed to fetch categories" });
    }
}

export const getOneCategory = async (req: Request, res: Response) => {
    try {
        const categoryId = Number(req.params.id);
        const category = await prisma.category.findUnique({
            where: {
                id: categoryId
            }
        });
        return res.status(200).json(category);
    } catch (error) {
        console.error("Error fetching category:", error);
        return res.status(500).json({ error: "Failed to fetch category" });
    }
}

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const categoryId = Number(req.params.id);
        const category = { ...req.body };
        await prisma.category.update({
            where: {
                id: categoryId
            },
            data: category
        });
        return res.status(200).json({ message: "Category updated successfully" });
    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({ error: "Failed to update category" });
    }
}

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const categoryId = Number(req.params.id);
        await prisma.category.delete({
            where: {
                id: categoryId
            }
        });
        return res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        return res.status(500).json({ error: "Failed to delete category" });
    }
}