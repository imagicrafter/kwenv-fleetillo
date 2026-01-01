import { Request, Response, NextFunction } from 'express';
import {
  createClient,
  getClientById,
  getClients,
  updateClient,
  deleteClient,
  restoreClient,
  countClients,
} from '../services/client.service.js';
import type { CreateClientInput, UpdateClientInput, ClientFilters } from '../types/client.js';
import type { PaginationParams } from '../types/index.js';

/**
 * Client Controller
 * Handles HTTP requests for client operations
 */

/**
 * Create a new client
 * POST /api/v1/clients
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input: CreateClientInput = req.body;
    const result = await createClient(input);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client by ID
 * GET /api/v1/clients/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await getClientById(id);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all clients with pagination and filters
 * GET /api/v1/clients
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = req.query;

    const pagination: PaginationParams = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await getClients(filters as ClientFilters, pagination);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update client
 * PUT /api/v1/clients/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const input: UpdateClientInput = {
      id,
      ...req.body,
    };

    const result = await updateClient(input);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete client (soft delete)
 * DELETE /api/v1/clients/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await deleteClient(id);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Restore deleted client
 * POST /api/v1/clients/:id/restore
 */
export const restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'ID is required' } });
      return;
    }
    const result = await restoreClient(id);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client count
 * GET /api/v1/clients/count
 */
export const count = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = req.query as ClientFilters;
    const result = await countClients(filters);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        count: result.data,
      },
    });
  } catch (error) {
    next(error);
  }
};
