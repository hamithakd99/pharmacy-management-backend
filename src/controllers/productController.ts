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
                productId : await generateProductCode(req.body.name, req.body.dosageForm, req.body.strengthValue),
                name : req.body.name,
                brand : req.body.brand,
                category : req.body.category,
                description : req.body.description,
                dosageForm : req.body.dosageForm,
                strengthValue : req.body.strengthValue,
                strengthUnit : req.body.strengthUnit,
                packSize : req.body.packSize
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
        const allProducts = await prisma.product.findMany({
            include : {
                stockBatchItems : true
            }
        });
        const products = allProducts.map((product) => {
            const totalStock = product.stockBatchItems.reduce(
                (total, item) => total + item.receivedQuantity, 0
            )
            const lastBatch = product.stockBatchItems.at(-1);
            return { ...product, 
                totalStock, 
                buyingPrice : lastBatch?.buyingPrice || 0,
                sellingPrice : lastBatch?.sellingPrice || 0
            };
        });

        
        return res.status(200).json(products);
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

export const getProductsByCategory = async (
    req : Request,
    res : Response
) => {
    try {
        const categoryParam = req.params.category;
        const categoryId = Number(Array.isArray(categoryParam) ? categoryParam[0] : categoryParam);

        if (Number.isNaN(categoryId)) {
            return res.status(400).json({ error: "Invalid category" });
        }

        const products = await prisma.product.findMany({
            where : {
                category : {
                    is : {
                        id : categoryId
                    }
                }
            }
        });
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching products by category:", error);
        return res.status(500).json({ error: "Failed to fetch products by category" });
    }
}

export const getProductsByName = async (
    req : Request,
    res : Response
) => {
    try {
        const nameParam = req.params.name;
        const productName = Array.isArray(nameParam) ? nameParam[0] : nameParam;

        if (!productName) {
            return res.status(400).json({ error: "Invalid product name" });
        }

        const products = await prisma.product.findMany({
            where : {
                name : {
                    contains : productName
                }
            }
        });
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching products by name:", error);
        return res.status(500).json({ error: "Failed to fetch products by name" });
    }
}

export const inactiveProducts = async (
    req : Request,
    res : Response
) => {
    try {
        const products = await prisma.product.findMany({
            where : {
                isActive : false
            }
        });
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching inactive products:", error);
        return res.status(500).json({ error: "Failed to fetch inactive products" });
    }
}

export const activeProducts = async (
    req : Request,
    res : Response
) => {
    try {
        const products = await prisma.product.findMany({
            where : {
                isActive : true
            }
        });
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching active products:", error);
        return res.status(500).json({ error: "Failed to fetch active products" });
    }
}

const getProductBySearch = async (
    req : Request,
    res : Response
) => {
    const query = req.query.q as string;
    try {
        const product = await prisma.product.findMany({
            where : {
                name : {
                    contains : query,
                    mode: "insensitive",
                },
            },
            take: 10,
        });
        return res.status(200).json({
            data : {
                name : product,
                count : product.length,
                category : product[0]?.categoryId ?? null
            }
        });
    } catch (error) {
        console.error("Error fetching product by search:", error);
        return res.status(500).json({ error: "Failed to fetch product by search" });
    }
}
