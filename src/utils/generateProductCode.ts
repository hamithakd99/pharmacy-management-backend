import type { DosageForm } from "../../generated/prisma/enums";


export const generateProductCode = (
    name: string,
    dosageForm: DosageForm,
    strengthValue: number
) => {

    const productPrefix = name
        .trim()
        .substring(0, 3)
        .toUpperCase();

    let dosageCode = "";

    switch (dosageForm) {
        case "TABLET":
            dosageCode = "T";
            break;

        case "CAPSULE":
            dosageCode = "C";
            break;

        case "SYRUP":
            dosageCode = "S";
            break;

        case "INJECTION":
            dosageCode = "I";
            break;

        case "CREAM":
            dosageCode = "CR";
            break;

        case "OINTMENT":
            dosageCode = "O";
            break;

        case "DROPS":
            dosageCode = "D";
            break;

        default:
            dosageCode = "X";
    }

    return `${productPrefix}-${dosageCode}${strengthValue
        .toString()
        .padStart(5, "0")}`;
};

export default generateProductCode;