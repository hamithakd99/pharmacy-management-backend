import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import generateToken from "../utils/generateToken";
import bcrypt from "bcrypt"

export const createUser = async (
    req: Request,
    res:Response) => {

        try {
            if(req.body.role == "Admin") {
                if((req as any).user != null) {
                    if((req as any).user.role != "Admin") {
                            return res.status(403).json({ error: "Only admin users can create admin users" });
                        }
                    } else {
                        return res.status(403).json({ error: "Authentication required to create admin users" });
                    }
            }
            
            //ROLE 

            const hashedPassword = bcrypt.hashSync(req.body.password, 10)
            const generateUserCode = async (role: string) => {

                let prefix = "";

                switch (req.body.role) {

                    case "ADMIN":
                        prefix = "ADM";
                        break;

                    case "CASHIER":
                        prefix = "CAS";
                        break;

                    default:
                        prefix = "EMP";
                }

                const count = await prisma.user.count({
                    where: { role: req.body.role }
                });

                const year = new Date().getFullYear().toString().slice(-2);

                return `${prefix}${year}${(count + 1)
                    .toString()
                    .padStart(4, "0")}`;
            };

            const user = await prisma.user.create({
                data: {
                    userId: await generateUserCode(req.body.role),
                    firstName : req.body.firstName,
                    lastName : req.body.lastName,
                    email : req.body.email,
                    password : hashedPassword,
                    role : req.body.role,
                    contactNumber: req.body.contactNumber,
                    // include required address fields (use empty string fallback if not provided)
                    addressLine1: req.body.addressLine1,
                    city: req.body.city,
                    province: req.body.province,
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
                    message : "User Not Found"
                }
            )
        }

        //check password using bcrypt
        if(!bcrypt.compareSync(req.body.password, user.password)) {
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

export const deleteUser = async (
        req: Request,
        res: Response
    ) => {

    try{

        if(req.body.role == "admin"){
            const userId = Number(req.params.id);

            await prisma.user.delete({
                where : {
                    id: userId
                }
            })
            return  res.status(200).json({ message: "User deleted successfully" });
        } else {
            return res.status(403).json({ error: "Only admin users can delete users" });
        }
        

    } catch (error) {
        return res.status(500).json({ error: "Failed to delete user" });
    }
}

export const updateUser = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const { firstName, lastName, email, role, contactNumber, addressLine1, city, province } = req.body;

        const updatedUser = await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                firstName,
                lastName,
                email,
                role,
                contactNumber,
                addressLine1,
                city,
                province
            }
        });

        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ error: "Failed to update user" });
    }
}