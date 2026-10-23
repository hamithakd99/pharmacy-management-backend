import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import generateExUserCode from "../utils/generateExternalUserCode";
import { getPagination } from "../utils/pagination";
import type { Prisma } from "../../generated/prisma/client";

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
    try {
        const customers = await prisma.externalUser.findMany({
            where: {
                role: "CUSTOMER",
            },
        });

        return res.status(200).json(customers);
    } catch (error) {
        console.error("Failed to get customers:", error);

        return res.status(500).json({
            message: "Failed to retrieve customers",
        });
    }
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
    req: Request,
    res: Response
) => {
    try {
        const { page, limit, skip } = getPagination(req);

        const search = String(req.query.search ?? "").trim();

        const where: Prisma.ExternalUserWhereInput = search
            ? {
                  OR: [
                      { userId: { contains: search, mode: "insensitive" } },
                      { firstName: { contains: search, mode: "insensitive" } },
                      { lastName: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                      {
                          contactNumber: {
                              contains: search,
                              mode: "insensitive",
                          },
                      },
                      { city: { contains: search, mode: "insensitive" } },
                  ],
              }
            : {};

        const [
            externalUsers,
            filteredTotal,
            totalExternal,
            suppliers,
            customers,
        ] = await Promise.all([
            prisma.externalUser.findMany({
                where,
                skip,
                take: limit,
                orderBy: { id: "desc" },
            }),

            prisma.externalUser.count({ where }),

            // Summary cards: සියලු external users
            prisma.externalUser.count(),

            prisma.externalUser.count({
                where: { role: "SUPPLIER" },
            }),

            prisma.externalUser.count({
                where: { role: "CUSTOMER" },
            }),
        ]);

        const totalPages = Math.ceil(filteredTotal / limit);

        return res.status(200).json({
            data: externalUsers,

            pagination: {
                page,
                limit,
                total: filteredTotal,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },

            summary: {
                totalExternal,
                suppliers,
                customers,
            },
        });
    } catch (error) {
        console.error("Error fetching external users:", error);

        return res.status(500).json({
            error: "Failed to fetch external users",
        });
    }
};

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