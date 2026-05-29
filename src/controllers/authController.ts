import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const createUser = async (
    req: Request,
    res:Response) => {

        try {
            const user = await prisma.user.create({
                data: req.body
            });
            res.status(201).json(user);
            console.log("User created successfully:", user);
        } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ error: "Failed to create user" });
        }


}

