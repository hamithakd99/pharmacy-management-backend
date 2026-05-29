import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import generateToken from "../utils/generateToken";

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

export const loginUser = async (
    req: Request,
    res: Response
) => {

    try {

        //email check
        const user = await prisma.user.findUnique({
            where: {
                email: req.body.email,
            }
        })
        if (!user) {
            return res.status(404).json(
                {
                    message : "User Not Found"
                }
            )
        }

        //check password
        if(user.password !== req.body.password) {
            return res.status(401).json(
                {
                    message : "Invalid Password"
                }
            )
        } else {

        }

        //token generate
        const token = generateToken
        (
            user.email,
            user.firstName,
            user.lastName,
            user.role
        );

        console.log("User logged in successfully:", user.firstName);
        return res.status(200).json(
            {
                message : "Login Successful",
                user : user.firstName,
                token : token
            }
        );

    } catch (error) {
        console.error("Error logging in user:", error);

        return res.status(500).json({
            message : "Failed to login user",
        })
    }

}

export const getAllUsers = async (req: Request, res: Response) => {
    try{
        const users = await prisma.user.findMany();
        console.log("Fetched users successfully:", users);
        return res.status(200).json(users);

    }catch(error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ error: "Failed to fetch users" });
    }
}