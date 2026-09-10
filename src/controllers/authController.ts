import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import generateToken from "../utils/generateToken";
import bcrypt from "bcrypt"
import generateUserCode from "../utils/generateUserCode";

export const createUser = async (
    req: Request,
    res: Response) => {

    try {
        if (req.body.role == "Admin") {
            if ((req as any).user != null) {
                if ((req as any).user.role != "Admin") {
                    return res.status(403).json({ error: "Only admin users can create admin users" });
                }
            } else {
                return res.status(403).json({ error: "Authentication required to create admin users" });
            }
        }

        //ROLE

        const hashedPassword = bcrypt.hashSync(req.body.password, 10)


        const user = await prisma.user.create({
            data: {
                userId: await generateUserCode(),
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                nickName: req.body.nickName? req.body.nickName : null,
                email: req.body.email,
                password: hashedPassword,
                role: req.body.role,
                contactNumber: req.body.contactNumber,
                // include required address fields (use empty string fallback if not provided)
                addressLine1: req.body.addressLine1,
                addressLine2: req.body.addressLine2,
                city: req.body.city,
                province: req.body.province,
                postalCode: req.body.postalCode? req.body.postalCode : null
            }
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
                    message: "User Not Found"
                }
            )
        }

        //check password using bcrypt
        if (!bcrypt.compareSync(req.body.password, user.password)) {
            return res.status(401).json(
                {
                    message: "Invalid Password"
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
                user.role,
                user.userId
            );

        console.log("User logged in successfully:", user.firstName);
        return res.status(200).json(
            {
                message: "Login Successful",
                token: token,
                role: user.role
            }
        );

    } catch (error) {
        console.error("Error logging in user:", error);

        return res.status(500).json({
            message: "Failed to login user",
        })
    }

}

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany();
        console.log("Fetched users successfully:", users);
        return res.status(200).json(users);

    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ error: "Failed to fetch users" });
    }
}

export const deleteUser = async (
    req: Request,
    res: Response
) => {

    try {
        const userId = Number(req.params.id);

        const deleteUser = await prisma.user.delete({
            where: {
                id: userId
            }
        })
        return res.status(200).json({ message: `${deleteUser.firstName} deleted successfully` });


    } catch (error) {
        return res.status(500).json({ error: "Failed to delete user" });
    }
}

export const getOneUser = async (
    req: Request,
    res: Response
) => {
    try {
        const user = Number(req.params.id);

        const oneUser = await prisma.user.findUnique({
            where: {
                id: user
            }
        })
        return res.status(200).json({
            message: `${oneUser?.firstName} fetched successfully`,
            user: oneUser
        })
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({ error: "Failed to fetch user" });
    }
}

export const updateUser = async (
    req: Request,
    res: Response
) => {

    try {

        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {

            return res.status(400).json({
                error: "Invalid user ID"
            });

        }

        const {
            firstName,
            lastName,
            email,
            role,
            contactNumber,
            nickName,
            addressLine1,
            addressLine2,
            city,
            province,
            postalCode
        } = req.body;

        const updatedUser =
            await prisma.user.update({
                where: {
                    id: userId
                },
                data: {

                    firstName,
                    lastName,
                    email,
                    role,
                    contactNumber,
                    nickName: nickName || null,
                    addressLine1,
                    addressLine2: addressLine2 || null,
                    city,
                    province,
                    postalCode: postalCode || null
                }
            });

        return res.status(200).json({
            message: "User updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error( "Error updating user:", error );
        return res.status(500).json({
            error: "Failed to update user"
        });
    }
};