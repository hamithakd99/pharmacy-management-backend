export const getGRNHistory = (
    stockBatches: any[]
) => {

    return stockBatches.map((batch) => {

        // =====================================================
        // TOTAL BUYING VALUE
        // =====================================================

        const totalBuyingValue =
            batch.items.reduce(
                (
                    total: number,
                    item: any
                ) => {

                    return (
                        total +
                        (
                            item.receivedQuantity *
                            item.buyingPrice
                        )
                    );

                },
                0
            );


        // =====================================================
        // TOTAL SELLING VALUE
        // =====================================================

        const totalSellingValue =
            batch.items.reduce(
                (
                    total: number,
                    item: any
                ) => {

                    return (
                        total +
                        (
                            item.receivedQuantity *
                            item.sellingPrice
                        )
                    );

                },
                0
            );


        // =====================================================
        // RETURN ONE GRN / BATCH
        // =====================================================

        return {

            id: batch.id,
            batchNumber: batch.batchNumber,
            invoiceNumber: batch.invoiceNumber,
            receivedDate: batch.receivedDate,
            paymentStatus: batch.paymentStatus,
            invoiceDiscountAmount: batch.invoiceDiscountAmount,
            totalBuyingValue,
            totalSellingValue,


            // =================================================
            // ITEMS RECEIVED IN THIS GRN
            // =================================================

            items:

                batch.items.map(
                    (item: any) => ({

                        id: item.id,
                        productId: item.product.productId,
                        productName: item.product.name,
                        brand: item.product.brand,
                        receivedQuantity: item.receivedQuantity,
                        buyingPrice: item.buyingPrice,
                        sellingPrice: item.sellingPrice,
                        lineBuyingTotal: item.receivedQuantity * item.buyingPrice,
                        lineSellingTotal: item.receivedQuantity * item.sellingPrice,
                        expiryDate: item.expiryDate,
                        manufacturingDate: item.manufacturingDate

                    })
                )

        };

    });

};