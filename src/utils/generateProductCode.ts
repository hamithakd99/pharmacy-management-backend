import { prisma } from "../../lib/prisma";

const generateProductCode = async (
    productName : String

) => {
    const prefix = productName.slice(0,4).toUpperCase();

    const lastProduct = await prisma.product.findFirst({
        where : {
            productId : {
                startsWith : prefix
            }
        },
        orderBy : {
            id : "desc"
        }
    });

    const lastProductNumber = lastProduct ? parseInt(lastProduct.productId.split("-")[1] ?? "0", 10) : 0;

    const nextNumber = lastProductNumber + 1;

    return `${prefix}-${nextNumber
        .toString()
        .padStart(4, "0")}`;
}

export default generateProductCode;