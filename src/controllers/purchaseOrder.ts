import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const createPurchaseOrder = async (
    req: Request,
    res: Response) => {

    try {
        const items = req.body.items;

        const newPurchaseOrder = await prisma.purchaseOrder.create({
            data: {
                orderNumber : req.body.orderNumber,
                supplierId : req.body.supplierId,
                status : req.body.status,
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity
                    })),
                },
            },
            include: {
                items: true,
            },
        });

        res.status(201).json(newPurchaseOrder);
    } catch (error) {
        res.status(500).json({ error: "Failed to create purchase order" });
    }
}