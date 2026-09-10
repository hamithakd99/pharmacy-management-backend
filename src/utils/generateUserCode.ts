import { prisma } from "../../lib/prisma";

const generateUserCode = async () => {

    const year =
        new Date()
            .getFullYear()
            .toString()
            .slice(-2);

    const lastUser =
        await prisma.user.findFirst({
            where: {
                userId: {
                    startsWith: `EMP${year}`
                }
            },
            orderBy: {
                id: "desc"
            }
        });

    let lastSequence = 0;

    if (lastUser) {

        const lastTwoDigits =
            lastUser.userId.slice(-2);

        lastSequence =
            parseInt(
                lastTwoDigits,
                10
            ) || 0;
    }

    const nextSequence =
        lastSequence + 1;

    if (nextSequence > 99) {

        throw new Error(
            "Maximum user ID sequence reached for this year"
        );
    }

    return `EMP${year}${nextSequence
        .toString()
        .padStart(2, "0")}`;

};

export default generateUserCode;