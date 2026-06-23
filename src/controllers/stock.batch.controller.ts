import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { generateBatchNumber } from "../utils/generateStockBatchCode";
import { generateInvoiceNumber } from "../utils/generateInvoiceNumber";

export const createNewBatch = async (
    req: Request, 
    res: Response) => {

        try {
            const newStockBatch = await prisma.stockBatch.create({
                data : {
                    batchNumber : await generateBatchNumber(),
                    receivedDate : new Date(req.body.receivedDate),
                    supplierId : req.body.supplierId,
                    paymentStatus : req.body.paymentStatus,
                    invoiceNumber : await generateInvoiceNumber(req.body.supplierId)
                }
            })
            return res.status(201).json({
                message : `Stock batch ${newStockBatch.batchNumber} created successfully`,
                data : newStockBatch
            });
        } catch (error) {
            return res.status(500).json({
                message : "Error creating stock batch",
                error : error
            });
        }
    }

export const getStockBatches = async (req: Request, res: Response) => {
    try {
        const stockBatches = await prisma.stockBatch.findMany();
        return res.status(200).json({
            message : "Stock batches retrieved successfully",
            data : stockBatches
        });
    } catch (error) {
        return res.status(500).json({
            message : "Error retrieving stock batches",
            error : error
        });
    }
}

export const getStockBatchById = async (req: Request, res: Response) => {

    const { batchNumber } = req.params;

    try {
        const stockBatch = await prisma.stockBatch.findUnique({
            where : { batchNumber : batchNumber as string }
        });
        if (!stockBatch) {
            return res.status(404).json({
                message : "Stock batch not found"
            });
        }
        return res.status(200).json({
            message : "Stock batch retrieved successfully",
            data : stockBatch
        });
    } catch (error) {
        return res.status(500).json({
            message : "Error retrieving stock batch",
            error : error
        });
    }
}

export const updateStockBatch = async (req: Request, res: Response) => {

    const { batchNumber } = req.params;
    try {
        const batch = await prisma.stockBatch.findUnique({
            where : { batchNumber : batchNumber as string }
        });
        if (!batch) {
            return res.status(404).json({
                message : "Stock batch not found"
            });
        }
        const updatedBatch = await prisma.stockBatch.update({
            where : { batchNumber : batchNumber as string },
            data : {
                paymentStatus : req.body.paymentStatus
            }
        });
        return res.status(200).json({
            message : "Stock batch updated successfully",
            data : updatedBatch
        });
    } catch (error) {
        return res.status(500).json({
            message : "Error updating stock batch",
            error : error
        });
    }
}