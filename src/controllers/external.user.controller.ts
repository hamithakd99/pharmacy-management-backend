import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import generateExUserCode from "../utils/generateExternalUserCode";

export const createUser = async (req: Request, res: Response) => {

    try { 

        const exUser = await prisma.externalUser.create({
            data: {
                userId: await generateExUserCode(req.body.role),
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                role: req.body.role,
                contactNumber: req.body.contactNumber,
                addressLine1: req.body.addressLine1,
                city: req.body.city,
                province: req.body.province
            }
        });
        res.status(201).json({
            message: `${exUser.firstName} Registed as a ${exUser.role} successfully`,
            data : exUser
        });
    } catch (error) {
        console.error("Error creating external user:", error);
        res.status(500).json({ error: "Failed to create external user" });
    }
}

export const getCustomers = async (
    req: Request,
    res: Response
    ) => {
    const customers = await prisma.externalUser.findMany({
        where: {
        role: "CUSTOMER"
        }
    });

    return res.status(200).json(customers);
};

export const getSuppliers = async (
    req: Request,
    res: Response
    ) => {
    const suppliers = await prisma.externalUser.findMany({
        where: {
        role: "SUPPLIER"
        }
    });

    return res.status(200).json(suppliers);
};

export const getoneExternalUser = async (
    req: Request,
    res: Response
) => {
    try {
        const exuserId = Number(req.params.id);
        const externalUser = await prisma.externalUser.findUnique({
            where: {
                id: exuserId
            }
        });

        if (!externalUser) {
            return res.status(404).json({ error: "External user not found" });
        }

        return res.status(200).json(externalUser);
    } catch (error) {
        console.error("Error fetching external user:", error);
        res.status(500).json({ error: "Failed to fetch external user" });
    }
};

export const getAllExternalUsers = async (
    req : Request,
    res : Response
) => {
    try {
        const allExternalUsers = await prisma.externalUser.findMany();
        return res.status(200).json(allExternalUsers);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch external users" });
    }
}

export const updateExternalUser = async (
    req: Request,
    res: Response
) => {
    try {
        const exuserId = Number(req.params.id);
        const updateExUser = { ...req.body };

        if (req.body.role) {
        return res.status(400).json({
            message: "Role cannot be updated"
        });
        }

        const user = await prisma.externalUser.update({
            where : {
                id : exuserId
            },
            data : updateExUser
        })
        return res.status(200).json({
            message : "External user updated successfully",
            user
        });
    } catch (error) {
        console.error("Error updating external user:", error);
        res.status(500).json({ error: "Failed to update external user" });
    }
}

export const deleteExternalUser = async (
    req: Request,
    res: Response
) => {

    try {
        const exuserId = Number(req.params.id);
        const deletedUser = await prisma.externalUser.delete({
            where : {
                id : exuserId
            }
        })
        return res.status(200).json({
            message : `${deletedUser.firstName} user deleted successfully as a ${deletedUser.role}`
        });
    } catch (error) {
        console.error("Error deleting external user:", error);
        res.status(500).json({ error: "Failed to delete external user" });
    }

}