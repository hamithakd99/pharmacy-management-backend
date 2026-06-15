import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma"
import generateProductCode from "../utils/generateProductCode";

export const createProduct = async (
    req : Request,
    res : Response
) => {
    try {

        const newproduct = await prisma.product.create({
            data : {
                productId : await generateProductCode(req.body.name),
                name : req.body.name,
                brand : req.body.brand,
                category : req.body.category,
                description : req.body.description,
                sellingPrice : req.body.sellingPrice,
            }
        })
        return res.status(201).json({
            message : `${newproduct.name} created successfully`,
            data : newproduct
        });
    } catch (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({ error: "Failed to create product" });
    }
}

export const getAllProducts = async (
    req : Request,
    res : Response
) => {
    try {
        const allProducts = await prisma.product.findMany();
        return res.status(200).json(allProducts);
    } catch (error) {
        console.error("Error fetching products:", error);
        return res.status(500).json({ error: "Failed to fetch products" });
    }
}

export const getOneProduct = async (
    req : Request,
    res : Response
) => {
    try {
        const product = Number(req.params.id);

        const oneProduct = await prisma.product.findUnique({
            where : {
                id : product
            }
        })
        return res.status(200).json(oneProduct);
    } catch (error) {
        console.error("Error fetching product:", error);
        return res.status(500).json({ error: "Failed to fetch product" });
    }
}

export const updateProduct = async (
    req : Request,
    res : Response
) => {
    try {
        const id = Number(req.params.id);
        const product = { ...req.body };

        const updateProduct = await prisma.product.update({
            where : {
                id : id
            },
            data : product
        });
        return res.status(200).json({
            message : `${updateProduct.name} updated successfully`,
            data : updateProduct
        });
    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ error: "Failed to update product" });
    }
}

export const deleteProduct = async (
    req : Request,
    res : Response
) => {
    const id = Number(req.params.id);
    try {
        const deletedProduct = await prisma.product.delete({
            where : {
                id : id
            }
        });
        return res.status(200).json({ message: `${deletedProduct.name} is deleted successfully` });
    } catch (error) {
        console.error("Error deleting product:", error);
        return res.status(500).json({ error: "Failed to delete product" });
    }
}