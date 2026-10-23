import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import generateToken from "../utils/generateToken";
import bcrypt from "bcrypt"
import generateUserCode from "../utils/generateUserCode";
import generateRefreshToken from "../utils/generateRefreshToken";
import jwt from "jsonwebtoken";
import { getPagination } from "../utils/pagination";
import type { Prisma } from "../../generated/prisma/browser";

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
                nickName: req.body.nickName ? req.body.nickName : null,
                email: req.body.email,
                password: hashedPassword,
                role: req.body.role,
                contactNumber: req.body.contactNumber,
                // include required address fields (use empty string fallback if not provided)
                addressLine1: req.body.addressLine1,
                addressLine2: req.body.addressLine2,
                city: req.body.city,
                province: req.body.province,
                postalCode: req.body.postalCode ? req.body.postalCode : null
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

        const refreshToken = generateRefreshToken(user.userId);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/user",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // console.log("User logged in successfully:", user.firstName);
        return res.status(200).json(
            {
                message: "Login Successful",
                token: token,
                role: user.role,
                user: {
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    nickName: user.nickName,
                    email: user.email,
                    role: user.role,
                },
            }
        );

    } catch (error) {
        console.error("Error logging in user:", error);

        return res.status(500).json({
            message: "Failed to login user",
        })
    }

}

export const getAllUsers = async (
    req: Request,
    res: Response
) => {
    try {
        const { page, limit, skip } = getPagination(req);

        const search = String(req.query.search ?? "").trim();

        const where: Prisma.UserWhereInput = search
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
            users,
            filteredTotal,
            totalStaff,
            admins,
            employees,
            cashiers,
        ] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),

            // Search එකට ගැළපෙන records ගණන
            prisma.user.count({ where }),

            // Summary cards: search/page එකෙන් ස්වාධීනයි
            prisma.user.count(),

            prisma.user.count({
                where: { role: "ADMIN" },
            }),

            prisma.user.count({
                where: { role: "EMPLOYEE" },
            }),

            prisma.user.count({
                where: { role: "CASHIER" },
            }),
        ]);

        const totalPages = Math.ceil(filteredTotal / limit);

        return res.status(200).json({
            data: users,

            pagination: {
                page,
                limit,
                total: filteredTotal,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },

            summary: {
                totalStaff,
                admins,
                employees,
                cashiers,
            },
        });
    } catch (error) {
        console.error("Error fetching users:", error);

        return res.status(500).json({
            error: "Failed to fetch users",
        });
    }
};

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
        console.error("Error updating user:", error);
        return res.status(500).json({
            error: "Failed to update user"
        });
    }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response
) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!refreshToken || !secret) {
      return res.status(401).json({
        message: "Refresh token required",
      });
    }

    const decoded = jwt.verify(refreshToken, secret, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded === "string" ||
      decoded.tokenType !== "refresh" ||
      typeof decoded.userId !== "string"
    ) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
    });

    if (!user) {
      res.clearCookie("refreshToken", { path: "/user" });

      return res.status(401).json({
        message: "User not found",
      });
    }

    const token = generateToken(
      user.email,
      user.firstName,
      user.lastName,
      user.role,
      user.userId
    );

    return res.status(200).json({ token });
  } catch {
    res.clearCookie("refreshToken", { path: "/user" });

    return res.status(401).json({
      message: "Refresh token invalid or expired",
    });
  }
};