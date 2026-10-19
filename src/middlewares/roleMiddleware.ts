import type { NextFunction, Request, Response } from "express";
import type { Role } from "../../generated/prisma/browser";

const requireRole = (...allowedRoles: Role[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const user = (req as any).user;

    // Check authentication
    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Check role permission
    if (!allowedRoles.includes(user.role as Role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
      });
    }

    return next();
  };
};

export default requireRole;