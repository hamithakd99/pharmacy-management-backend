import type { Role } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const generateUserCode = async (role: Role) => {

                let prefix = "";

                switch (role) {

                    case "ADMIN":
                        prefix = "ADM";
                        break;

                    case "CASHIER":
                        prefix = "CAS";
                        break;

                    default:
                        prefix = "EMP";
                }

                const lastUser = await prisma.user.findFirst({
                    where : {
                        role : role
                    },
                    orderBy : {
                        id : "desc"
                    }
                })

                const lastUserId = lastUser ? parseInt(lastUser.userId.slice(-4)): 0;

                const year = new Date().getFullYear().toString().slice(-2);

                return `${prefix}${year}${(lastUserId + 1)
                    .toString()
                    .padStart(4, "0")}`;
            };

            export default generateUserCode;