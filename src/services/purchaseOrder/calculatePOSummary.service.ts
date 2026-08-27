export const calculatePOSummary = (
    items: any[],
    grnHistory: any[]
) => {

    // =====================================================
    // TOTAL ORDERED
    // =====================================================

    const totalOrderedItems =
        items.reduce(
            (
                total: number,
                item: any
            ) =>
                total +
                item.quantity,
            0
        );


    // =====================================================
    // TOTAL RECEIVED
    // =====================================================

    const totalReceivedItems =
        items.reduce(
            (
                total: number,
                item: any
            ) =>
                total +
                item.alreadyReceived,
            0
        );


    // =====================================================
    // TOTAL REMAINING
    // =====================================================

    const totalRemainingItems =
        items.reduce(
            (
                total: number,
                item: any
            ) =>
                total +
                item.remainingQuantity,
            0
        );


    // =====================================================
    // TOTAL BUYING VALUE
    // =====================================================

    const totalBuyingValue =
        grnHistory.reduce(
            (
                total: number,
                grn: any
            ) =>
                total +
                grn.totalBuyingValue,
            0
        );


    // =====================================================
    // TOTAL SELLING VALUE
    // =====================================================

    const totalSellingValue =
        grnHistory.reduce(
            (
                total: number,
                grn: any
            ) =>
                total +
                grn.totalSellingValue,
            0
        );


    return {

        totalOrderedItems,
        totalReceivedItems,
        totalRemainingItems,
        totalBuyingValue,
        totalSellingValue,
        totalGRNs: grnHistory.length

    };

};