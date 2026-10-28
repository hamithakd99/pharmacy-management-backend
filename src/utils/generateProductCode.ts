import { prisma } from "../../lib/prisma"; 

export const generateProductCode = async (
  name: string,
  dosageForm: string | null,
  strengthValue: string | null,
  strengthUnit: string | null,
  dimensionsValue: string | null,
  dimensionsUnit: string | null
): Promise<string> => {
  const prefix = name.substring(0, 3).toUpperCase().padEnd(3, "X");
  const formChar = dosageForm ? dosageForm.charAt(0).toUpperCase() : "G";

  let suffix = "";
  
  if (strengthValue) {

    const val = strengthValue.replace(/[^0-9.]/g, ""); 
    const unit = strengthUnit ? strengthUnit.toUpperCase() : "";
    suffix = `-${val}${unit}`;
    
  } else if (dimensionsValue) {
    const val = dimensionsValue.replace(/[^0-9.]/g, "");
    const unit = dimensionsUnit ? dimensionsUnit.toUpperCase() : "";
    suffix = `-${val}${unit}`;
  }

  const baseCode = `${prefix}-${formChar}${suffix}`;

  let uniqueCode = baseCode;
  let counter = 1;

  while (true) {
    const existingProduct = await prisma.product.findUnique({
      where: { productId: uniqueCode },
    });

    if (!existingProduct) {
      break;
    }

    uniqueCode = `${baseCode}-${counter}`;
    counter++;
  }

  return uniqueCode;
};