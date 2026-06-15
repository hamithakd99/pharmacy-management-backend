import type { ExternalUserRole } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const generateExUserCode = async (role: ExternalUserRole) => {

                let prefix = "";

                switch (role) {

                    case "SUPPLIER":
                        prefix = "SUP";
                        break;

                    default:
                        prefix = "CUS";
                }

                const lastUser = await prisma.externalUser.findFirst({
                    where : {
                        role : role
                    },
                    orderBy : {
                        id : "desc"
                    }
                })
                
                const lastUserId = lastUser ? parseInt(lastUser.userId.slice(-4)) : 0;

                const year = new Date().getFullYear().toString().slice(-2);

                return `${prefix}${year}${(lastUserId + 1)
                    .toString()
                    .padStart(4, "0")}`;
            };

            export default generateExUserCode;