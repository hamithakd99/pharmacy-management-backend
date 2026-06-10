import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import type { ExternalUserRole } from "../../generated/prisma/browser";

export const createUser = async (req: Request, res: Response) => {

    try {
        const exUser = await prisma.externalUser.create({
            data: {
                userId: req.body.userId,
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

export const updateExternalUser = async (
    req: Request,
    res: Response
) => {
    try {
        const exuserId = Number(req.params.id);
        const { firstName, lastName, email, contactNumber, addressLine1, city, province } = req.body;
        const user = await prisma.externalUser.update({
            where : {
                id : exuserId
            },
            data : {
                firstName,
                lastName,
                email,
                contactNumber,
                addressLine1,
                city,
                province
            }
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