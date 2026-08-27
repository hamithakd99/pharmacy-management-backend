export const calculatePOItems = (
    items: any[]
) => {

    return items.map((item) => {

        // =====================================================
        // TOTAL ALREADY RECEIVED
        // =====================================================

        const alreadyReceived =
            item.stockBatchItems.reduce(
                (
                    total: number,
                    grnItem: any
                ) => {

                    return (
                        total +
                        grnItem.receivedQuantity
                    );

                },
                0
            );


        // =====================================================
        // REMAINING
        // =====================================================

        const remainingQuantity =
            Math.max(
                item.quantity -
                alreadyReceived,
                0
            );


        return {

            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            alreadyReceived,
            remainingQuantity,
            product: item.product

        };

    });

};