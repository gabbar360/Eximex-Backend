import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Service for packaging steps operations
 */
class PackagingStepsService {
  /**
   * Create packaging steps template for a category
   */
  static async createCategoryTemplate(categoryId, steps, userId) {
    try {
      // Delete existing template steps for this category
      await prisma.productPackagingSteps.deleteMany({
        where: {
          categoryId: Number(categoryId),
          productId: null, // Template steps don't have productId
        },
      });

      const createdSteps = [];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        const packagingStep = await prisma.productPackagingSteps.create({
          data: {
            categoryId: Number(categoryId),
            stepNumber: i + 1,
            stepType: step.stepType || 'PACKING',
            description: step.description,
            packagingUnitId: step.packagingUnitId
              ? Number(step.packagingUnitId)
              : null,
            quantity: step.quantity ? Number(step.quantity) : null,
            material: step.material || null,
            weight: step.weight ? Number(step.weight) : null,
            weightUnit: step.weightUnit || 'kg',
            dimensions: step.dimensions || null,

            containerNumber: step.containerNumber || null,
            sealType: step.sealType || null,
            sealNumber: step.sealNumber || null,
            notes: step.notes || null,
            createdBy: userId,
          },
          include: {
            packagingUnit: true,
            category: true,
          },
        });

        createdSteps.push(packagingStep);
      }

      return createdSteps;
    } catch (error) {
      throw new Error(`Failed to create category template: ${error.message}`);
    }
  }

  /**
   * Apply category template to a product
   */
  static async applyCategoryTemplate(
    productId,
    piInvoiceId,
    categoryId,
    userId
  ) {
    try {
      // Get template steps for the category
      const templateSteps = await prisma.productPackagingSteps.findMany({
        where: {
          categoryId: Number(categoryId),
          productId: null, // Template steps
          isActive: true,
        },
        orderBy: { stepNumber: 'asc' },
      });

      if (templateSteps.length === 0) {
        throw new Error('No template steps found for this category');
      }

      // Delete existing steps for this product-PI combination
      await prisma.productPackagingSteps.deleteMany({
        where: {
          productId: Number(productId),
          piInvoiceId: piInvoiceId ? Number(piInvoiceId) : null,
        },
      });

      // Create new steps based on template
      const createdSteps = [];

      for (const templateStep of templateSteps) {
        const packagingStep = await prisma.productPackagingSteps.create({
          data: {
            productId: Number(productId),
            piInvoiceId: piInvoiceId ? Number(piInvoiceId) : null,
            categoryId: templateStep.categoryId,
            stepNumber: templateStep.stepNumber,
            stepType: templateStep.stepType,
            description: templateStep.description,
            packagingUnitId: templateStep.packagingUnitId,
            quantity: templateStep.quantity,
            material: templateStep.material,
            weight: templateStep.weight,
            weightUnit: templateStep.weightUnit,
            dimensions: templateStep.dimensions,

            containerNumber: templateStep.containerNumber,
            sealType: templateStep.sealType,
            sealNumber: templateStep.sealNumber,
            notes: templateStep.notes,
            createdBy: userId,
          },
          include: {
            packagingUnit: true,
            category: true,
          },
        });

        createdSteps.push(packagingStep);
      }

      return createdSteps;
    } catch (error) {
      throw new Error(`Failed to apply category template: ${error.message}`);
    }
  }

  /**
   * Calculate packaging costs for a PI
   */
  static async calculatePackagingCosts(piInvoiceId) {
    try {
      const steps = await prisma.productPackagingSteps.findMany({
        where: {
          piInvoiceId: Number(piInvoiceId),
          isActive: true,
        },
        include: {
          product: true,
        },
      });

      // Cost calculation removed as cost field no longer exists

      return costBreakdown;
    } catch (error) {
      throw new Error(`Failed to calculate packaging costs: ${error.message}`);
    }
  }

  /**
   * Get packaging summary for a PI
   */
  static async getPackagingSummary(piInvoiceId) {
    try {
      const steps = await prisma.productPackagingSteps.findMany({
        where: {
          piInvoiceId: Number(piInvoiceId),
          isActive: true,
        },
        include: {
          product: true,
          packagingUnit: true,
        },
      });

      const summary = {
        totalSteps: steps.length,
        totalWeight: 0,

        stepTypes: {},
        materials: {},
        products: {},
      };

      steps.forEach((step) => {
        // Weight calculation
        if (step.weight) {
          summary.totalWeight += step.weight;
        }

        // Step types
        if (!summary.stepTypes[step.stepType]) {
          summary.stepTypes[step.stepType] = 0;
        }
        summary.stepTypes[step.stepType]++;

        // Materials
        if (step.material) {
          if (!summary.materials[step.material]) {
            summary.materials[step.material] = 0;
          }
          summary.materials[step.material]++;
        }

        // Products
        if (!summary.products[step.productId]) {
          summary.products[step.productId] = {
            productName: step.product.name,
            stepCount: 0,
          };
        }
        summary.products[step.productId].stepCount++;
      });

      return summary;
    } catch (error) {
      throw new Error(`Failed to get packaging summary: ${error.message}`);
    }
  }

  /**
   * Validate packaging steps completeness
   */
  static async validatePackagingCompleteness(piInvoiceId) {
    try {
      // Get all products in the PI
      const piProducts = await prisma.piProduct.findMany({
        where: { piInvoiceId: Number(piInvoiceId) },
        include: { product: true },
      });

      // Get packaging steps for the PI
      const packagingSteps = await prisma.productPackagingSteps.findMany({
        where: {
          piInvoiceId: Number(piInvoiceId),
          isActive: true,
        },
      });

      const validation = {
        isComplete: true,
        missingProducts: [],
        incompleteProducts: [],
        totalProducts: piProducts.length,
        productsWithSteps: 0,
      };

      const productStepsMap = packagingSteps.reduce((acc, step) => {
        if (!acc[step.productId]) {
          acc[step.productId] = [];
        }
        acc[step.productId].push(step);
        return acc;
      }, {});

      piProducts.forEach((piProduct) => {
        const productSteps = productStepsMap[piProduct.productId] || [];

        if (productSteps.length === 0) {
          validation.missingProducts.push({
            productId: piProduct.productId,
            productName: piProduct.productName,
          });
          validation.isComplete = false;
        } else {
          validation.productsWithSteps++;

          // Check if essential steps are present
          const hasPackingStep = productSteps.some(
            (step) => step.stepType === 'PACKING'
          );
          if (!hasPackingStep) {
            validation.incompleteProducts.push({
              productId: piProduct.productId,
              productName: piProduct.productName,
              reason: 'Missing basic packing step',
            });
            validation.isComplete = false;
          }
        }
      });

      return validation;
    } catch (error) {
      throw new Error(
        `Failed to validate packaging completeness: ${error.message}`
      );
    }
  }
}

export default PackagingStepsService;
