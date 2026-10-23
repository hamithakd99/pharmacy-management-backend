import type { Request } from "express";

export const getPagination = (req: Request) => {
    const page = Math.max(
        1,
        Number(req.query.page) || 1
    );

    const limit = Math.min(
        100,
        Math.max(
            1,
            Number(req.query.limit) || 20
        )
    );

    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
};