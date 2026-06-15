import type { NextFunction, Request, Response } from "express";

const adminOnly = async (
    req : Request,
    res : Response,
    next : NextFunction
) => {
    
    const user = (req as any).user;

    if(!user) {
        return res.status(401).json({
            message : "Unauthorized"
        })
    }

    if(user.role !== "ADMIN") {
        return res.status(403).json({
            message : "Admin access required"
        })
    }

    next();
}


export default adminOnly;