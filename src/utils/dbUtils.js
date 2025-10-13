import { prisma } from '../config/dbConfig.js';
import { ApiError } from './ApiError.js';

export class DatabaseUtils {
  /**
   * Generic find one with error handling
   */
  static async findOne(model, where, select = null, include = null) {
    try {
      const options = { where };
      if (select) options.select = select;
      if (include) options.include = include;

      const result = await prisma[model].findFirst(options);
      return result;
    } catch (error) {
      throw new ApiError(500, `Database error while finding ${model}`);
    }
  }

  /**
   * Generic find many with pagination
   */
  static async findMany(model, options = {}) {
    try {
      const {
        where = {},
        select = null,
        orderBy = { createdAt: 'desc' },
        page = 1,
        limit = 10,
        include = null,
      } = options;

      const skip = (page - 1) * limit;

      const queryOptions = {
        where,
        orderBy,
        skip,
        take: limit,
      };

      if (select) queryOptions.select = select;
      if (include) queryOptions.include = include;

      const [data, total] = await Promise.all([
        prisma[model].findMany(queryOptions),
        prisma[model].count({ where }),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new ApiError(500, `Database error while finding ${model}`);
    }
  }

  /**
   * Generic create with error handling
   */
  static async create(model, data) {
    try {
      const result = await prisma[model].create({ data });
      return result;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ApiError(409, 'Record already exists');
      }
      throw new ApiError(500, `Database error while creating ${model}`);
    }
  }

  /**
   * Generic update with error handling
   */
  static async update(model, where, data) {
    try {
      const result = await prisma[model].update({
        where,
        data,
      });
      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError(404, 'Record not found');
      }
      if (error.code === 'P2002') {
        throw new ApiError(409, 'Record already exists');
      }
      throw new ApiError(500, `Database error while updating ${model}`);
    }
  }

  /**
   * Generic delete with error handling
   */
  static async delete(model, where) {
    try {
      const result = await prisma[model].delete({ where });
      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError(404, 'Record not found');
      }
      throw new ApiError(500, `Database error while deleting ${model}`);
    }
  }

  /**
   * Soft delete (update status to deleted)
   */
  static async softDelete(model, where) {
    try {
      const result = await prisma[model].update({
        where,
        data: { status: 'deleted' },
      });
      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError(404, 'Record not found');
      }
      throw new ApiError(500, `Database error while soft deleting ${model}`);
    }
  }

  /**
   * Transaction wrapper
   */
  static async transaction(callback) {
    try {
      return await prisma.$transaction(callback);
    } catch (error) {
      throw new ApiError(500, 'Transaction failed');
    }
  }

  /**
   * Check if record exists
   */
  static async exists(model, where) {
    try {
      const count = await prisma[model].count({ where });
      return count > 0;
    } catch (error) {
      throw new ApiError(
        500,
        `Database error while checking existence of ${model}`
      );
    }
  }

  /**
   * Get count with conditions
   */
  static async count(model, where = {}) {
    try {
      return await prisma[model].count({ where });
    } catch (error) {
      throw new ApiError(500, `Database error while counting ${model}`);
    }
  }
}
