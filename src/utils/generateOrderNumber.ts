export const generateOrderNumber = (sequence: number): string => {
    const now = new Date();

    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const datePart = `${year}${month}${day}`;
    const sequencePart = String(sequence).padStart(3, "0");

    return `ORD-${datePart}-${sequencePart}`;
};