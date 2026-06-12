import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const authMiddleware = async (
    req: Request, 
    res: Response, 
    next: NextFunction
    ) => {
        const tokenString = req.header("Authorization");
        if(tokenString != null) {
            const token = tokenString.replace("Bearer ", "");
            
            jwt.verify(token, process.env.JWT_SECRET!, 
                (err,decode) => {
                    if (decode != null) {
                        (req as any).user = decode;
                        next();

                    } else {
                        return res.status(401).json({
                            message : "Invalid Token"
                        })
                    }
                }
            )
        } else {
            next();
        }
}

export default authMiddleware;