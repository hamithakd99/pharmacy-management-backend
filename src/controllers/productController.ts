import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma"
import { getPagination } from "../utils/pagination";
import { DimensionUnit, DosageForm, StrengthUnit } from "../../generated/prisma/enums";
import { Prisma } from "../../generated/prisma/client";
import { generateProductCode } from "../utils/generateProductCode";


export const createProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      brand,
      categoryId,
      description,
      dosageForm,
      strengthValue,
      strengthUnit,
      dimensionsValue,
      dimensionsUnit,
      packSize,
    } = req.body;

    // Validate product name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: "Product name is required",
      });
    }

    // Validate optional enum fields
    if (
      dosageForm != null &&
      dosageForm !== "" &&
      !Object.values(DosageForm).includes(dosageForm as DosageForm)
    ) {
      return res.status(400).json({
        error: "Invalid dosage form",
      });
    }

    if (
      strengthUnit != null &&
      strengthUnit !== "" &&
      !Object.values(StrengthUnit).includes(strengthUnit as StrengthUnit)
    ) {
      return res.status(400).json({
        error: "Invalid strength unit",
      });
    }

    if (
      dimensionsUnit != null &&
      dimensionsUnit !== "" &&
      !Object.values(DimensionUnit).includes(dimensionsUnit as DimensionUnit)
    ) {
      return res.status(400).json({
        error: "Invalid dimensions unit",
      });
    }

    const parsedCategoryId =
      categoryId == null || categoryId === ""
        ? null
        : Number(categoryId);

    const parsedPackSize =
      packSize == null || packSize === ""
        ? null
        : Number(packSize);

    if (
      parsedCategoryId !== null &&
      (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0)
    ) {
      return res.status(400).json({
        error: "Invalid category ID",
      });
    }

    if (
      parsedPackSize !== null &&
      (!Number.isInteger(parsedPackSize) || parsedPackSize <= 0)
    ) {
      return res.status(400).json({
        error: "Pack size must be a positive integer",
      });
    }

    const normalizedStrengthValue =
      strengthValue == null || strengthValue === ""
        ? null
        : String(strengthValue).trim();

    const normalizedDimensionsValue =
      dimensionsValue == null || dimensionsValue === ""
        ? null
        : String(dimensionsValue).trim();

    // 1. Transaction එකක් නැතිව මුලින්ම Product ID එක Generate කරගැනීම
    const productId = await generateProductCode(
      name.trim(),
      dosageForm || null,
      normalizedStrengthValue,
      strengthUnit || null,
      normalizedDimensionsValue,
      dimensionsUnit || null
    );

    // 2. Generate වූ ID එක යොදාගෙන කෙලින්ම Product එක Create කිරීම
    const newProduct = await prisma.product.create({
      data: {
        productId, // මෙතනට අලුත් code එක එනවා (උදා: PAN-T-500MG)
        name: name.trim(),
        brand: brand || null,
        categoryId: parsedCategoryId,
        description: description || null,
        dosageForm: dosageForm || null,
        strengthValue: normalizedStrengthValue,
        strengthUnit: strengthUnit || null,
        dimensionsValue: normalizedDimensionsValue,
        dimensionsUnit: dimensionsUnit || null,
        packSize: parsedPackSize,
      },
    });

    return res.status(201).json({
      message: `${newProduct.name} created successfully`,
      data: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        error: "A product with this unique identifier already exists",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return res.status(400).json({
        error: "Invalid category reference",
      });
    }

    return res.status(500).json({
      error: "Failed to create product",
    });
  }
};




export const getAllProducts = async (
  req: Request,
  res: Response
) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const search = String(req.query.search ?? "").trim();

    const where = search
      ? {
          OR: [
            {
              productId: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              brand: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    const [
      total,
      allProducts,
      totalProducts,
      summaryProducts,
    ] = await Promise.all([
      // Search result count for pagination
      prisma.product.count({ where }),

      // Products on the current page only
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          stockBatchItems: true,
        },
      }),

      // Global active product count
      prisma.product.count({
        where: { isActive: true },
      }),

      // All active products and their batch-level stock values
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          reorderLevel: true,
          stockBatchItems: {
            select: {
              availableQuantity: true,
              buyingPrice: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();

    const products = allProducts.map((product) => {
      const totalStock = product.stockBatchItems.reduce(
        (sum, item) => sum + item.availableQuantity,
        0
      );

      // Nearest-expiry batch with available, unexpired stock
      const currentBatch = product.stockBatchItems
        .filter(
          (item) =>
            item.availableQuantity > 0 &&
            new Date(item.expiryDate) > now
        )
        .sort(
          (a, b) =>
            new Date(a.expiryDate).getTime() -
            new Date(b.expiryDate).getTime()
        )[0];

      return {
        ...product,
        totalStock,
        buyingPrice: currentBatch?.buyingPrice ?? 0,
        sellingPrice: currentBatch?.sellingPrice ?? 0,
      };
    });

    // Global statistics: never calculate these from allProducts,
    // because allProducts contains only the current page.
    let totalStock = 0;
    let inventoryValue = 0;
    let lowStockProducts = 0;

    for (const product of summaryProducts) {
      let productStock = 0;

      for (const batch of product.stockBatchItems) {
        const quantity = batch.availableQuantity;

        productStock += quantity;

        // Value each batch using its own buying price
        inventoryValue += quantity * batch.buyingPrice;
      }

      totalStock += productStock;

      if (productStock <= product.reorderLevel) {
        lowStockProducts++;
      }
    }

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      data: products,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },

      stats: {
        totalProducts,
        totalStock,
        inventoryValue,
        lowStockProducts,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);

    return res.status(500).json({
      error: "Failed to fetch products",
    });
  }
};


export const getProductDetails = async (
    req: Request,
    res: Response) => {

    try {

        const id = Number(req.params.id);
        const product = await prisma.product.findUnique({

            where: {

                id

            },

            include: {

                category: true,

                stockBatchItems: {

                    include: {

                        stockBatch: {

                            include: {

                                supplier: true

                            }

                        }

                    }

                }

            }

        });
        return res.status(200).json(product);
    } catch (error) {
        console.error("Error fetching product details:", error);
        return res.status(500).json({ error: "Failed to fetch product details" });
    }
}

export const getOneProduct = async (
    req: Request,
    res: Response
) => {
    try {
        const product = Number(req.params.id);

        const oneProduct = await prisma.product.findUnique({
            where: {
                id: product
            }
        })
        return res.status(200).json(oneProduct);
    } catch (error) {
        console.error("Error fetching product:", error);
        return res.status(500).json({ error: "Failed to fetch product" });
    }
}


export const updateProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid product ID",
      });
    }

    const {
      name,
      brand,
      categoryId,
      description,
      dosageForm,
      strengthValue,
      strengthUnit,
      dimensionsValue,
      dimensionsUnit,
      packSize,
      reorderLevel,
      isActive,
    } = req.body;

    const data: Prisma.ProductUpdateInput = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: "Product name cannot be empty",
        });
      }

      data.name = name.trim();
    }

    if (brand !== undefined) {
      data.brand = brand || null;
    }

    if (description !== undefined) {
      data.description = description || null;
    }

    if (categoryId !== undefined) {
      if (categoryId === "" || categoryId === null) {
        data.category = { disconnect: true };
      } else {
        const parsedCategoryId = Number(categoryId);

        if (
          !Number.isInteger(parsedCategoryId) ||
          parsedCategoryId <= 0
        ) {
          return res.status(400).json({
            error: "Invalid category ID",
          });
        }

        data.category = {
          connect: { id: parsedCategoryId },
        };
      }
    }

    if (dosageForm !== undefined) {
      if (
        dosageForm !== null &&
        dosageForm !== "" &&
        !Object.values(DosageForm).includes(dosageForm)
      ) {
        return res.status(400).json({
          error: "Invalid dosage form",
        });
      }

      data.dosageForm = dosageForm || null;
    }

    if (strengthValue !== undefined) {
      data.strengthValue =
        strengthValue === "" || strengthValue === null
          ? null
          : String(strengthValue).trim();
    }

    if (strengthUnit !== undefined) {
      if (
        strengthUnit !== null &&
        strengthUnit !== "" &&
        !Object.values(StrengthUnit).includes(strengthUnit)
      ) {
        return res.status(400).json({
          error: "Invalid strength unit",
        });
      }

      data.strengthUnit = strengthUnit || null;
    }

    if (dimensionsValue !== undefined) {
      data.dimensionsValue =
        dimensionsValue === "" || dimensionsValue === null
          ? null
          : String(dimensionsValue).trim();
    }

    if (dimensionsUnit !== undefined) {
      if (
        dimensionsUnit !== null &&
        dimensionsUnit !== "" &&
        !Object.values(DimensionUnit).includes(dimensionsUnit)
      ) {
        return res.status(400).json({
          error: "Invalid dimensions unit",
        });
      }

      data.dimensionsUnit = dimensionsUnit || null;
    }

    if (packSize !== undefined) {
      if (packSize === "" || packSize === null) {
        data.packSize = null;
      } else {
        const parsedPackSize = Number(packSize);

        if (
          !Number.isInteger(parsedPackSize) ||
          parsedPackSize <= 0
        ) {
          return res.status(400).json({
            error: "Pack size must be a positive integer",
          });
        }

        data.packSize = parsedPackSize;
      }
    }

    if (reorderLevel !== undefined) {
      const parsedReorderLevel = Number(reorderLevel);

      if (
        !Number.isInteger(parsedReorderLevel) ||
        parsedReorderLevel < 0
      ) {
        return res.status(400).json({
          error: "Reorder level must be a non-negative integer",
        });
      }

      data.reorderLevel = parsedReorderLevel;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          error: "isActive must be a boolean",
        });
      }

      data.isActive = isActive;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data,
    });

    return res.status(200).json({
      message: `${updatedProduct.name} updated successfully`,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return res.status(400).json({
        error: "Invalid category reference",
      });
    }

    return res.status(500).json({
      error: "Failed to update product",
    });
  }
};


export const deleteProduct = async (
    req: Request,
    res: Response
) => {
    const id = Number(req.params.id);
    try {
        const deletedProduct = await prisma.product.delete({
            where: {
                id: id
            }
        });
        return res.status(200).json({ message: `${deletedProduct.name} is deleted successfully` });
    } catch (error) {
        console.error("Error deleting product:", error);
        return res.status(500).json({ error: "Failed to delete product" });
    }
}

export const getProductsByCategory = async (
    req: Request,
    res: Response
) => {
    try {
        const categoryParam = req.params.category;
        const categoryId = Number(Array.isArray(categoryParam) ? categoryParam[0] : categoryParam);

        if (Number.isNaN(categoryId)) {
            return res.status(400).json({ error: "Invalid category" });
        }

        const products = await prisma.product.findMany({
            where: {
                category: {
                    is: {
                        id: categoryId
                    }
                }
            }
        });
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching products by category:", error);
        return res.status(500).json({ error: "Failed to fetch products by category" });
    }
}

export const getProductsByName = async (
    req: Request,
    res: Response
) => {
    try {
        const nameParam = req.params.name;
        const productName = Array.isArray(nameParam) ? nameParam[0] : nameParam;

        if (!productName) {
            return res.status(400).json({ error: "Invalid product name" });
        }

        const products = await prisma.product.findMany({
            where: {
                name: {
                    contains: productName
                }
            }
        });
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching products by name:", error);
        return res.status(500).json({ error: "Failed to fetch products by name" });
    }
}

export const inactiveProducts = async (
    req: Request,
    res: Response
) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                isActive: false
            }
        });
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching inactive products:", error);
        return res.status(500).json({ error: "Failed to fetch inactive products" });
    }
}

export const activeProducts = async (
    req: Request,
    res: Response
) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                isActive: true
            }
        });
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching active products:", error);
        return res.status(500).json({ error: "Failed to fetch active products" });
    }
}

const getProductBySearch = async (
    req: Request,
    res: Response
) => {
    const query = req.query.q as string;
    try {
        const product = await prisma.product.findMany({
            where: {
                name: {
                    contains: query,
                    mode: "insensitive",
                },
            },
            take: 10,
        });
        return res.status(200).json({
            data: {
                name: product,
                count: product.length,
                category: product[0]?.categoryId ?? null
            }
        });
    } catch (error) {
        console.error("Error fetching product by search:", error);
        return res.status(500).json({ error: "Failed to fetch product by search" });
    }
}
