// server/src/controllers/ludotecaController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { GameType, GameCondition } from '@prisma/client';

/**
 * Obtener todos los items de la ludoteca con filtros opcionales
 */
export const getLibraryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      gameType,
      condition,
      ownerEmail,
      page = '1',
      limit = '50',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Construir filtros
    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { internalId: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (gameType && typeof gameType === 'string') {
      where.gameType = gameType as GameType;
    }

    if (condition && typeof condition === 'string') {
      where.condition = condition as GameCondition;
    }

    if (ownerEmail && typeof ownerEmail === 'string') {
      if (ownerEmail === 'club') {
        // Filtrar solo items del club (sin propietario individual)
        where.ownerEmail = null;
      } else {
        where.ownerEmail = ownerEmail;
      }
    }

    // Paginación
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Ordenamiento
    const orderBy: any = {};
    if (sortBy === 'name' || sortBy === 'internalId' || sortBy === 'acquisitionDate') {
      orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.name = 'asc';
    }

    // Obtener items y contar total
    const [items, total] = await Promise.all([
      prisma.libraryItem.findMany({
        where,
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.libraryItem.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener items de la ludoteca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener items de la ludoteca'
    });
  }
};

/**
 * Obtener un item específico por ID
 */
export const getLibraryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await prisma.libraryItem.findUnique({
      where: { id }
    });

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error al obtener item:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener item'
    });
  }
};

/**
 * Obtener estadísticas de la ludoteca
 */
export const getLibraryStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total de items
    const total = await prisma.libraryItem.count();

    // Por tipo de juego
    const byGameType = await prisma.libraryItem.groupBy({
      by: ['gameType'],
      _count: true
    });

    // Por condición
    const byCondition = await prisma.libraryItem.groupBy({
      by: ['condition'],
      _count: true
    });

    // Items del club vs. de socios
    const clubItems = await prisma.libraryItem.count({
      where: { ownerEmail: null }
    });

    const memberItems = await prisma.libraryItem.count({
      where: { ownerEmail: { not: null } }
    });

    // Propietarios únicos
    const owners = await prisma.libraryItem.groupBy({
      by: ['ownerEmail'],
      where: { ownerEmail: { not: null } },
      _count: true
    });

    res.json({
      success: true,
      data: {
        total,
        clubItems,
        memberItems,
        byGameType: byGameType.map(item => ({
          type: item.gameType,
          count: item._count
        })),
        byCondition: byCondition.map(item => ({
          condition: item.condition,
          count: item._count
        })),
        uniqueOwners: owners.length
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

/**
 * Obtener filtros disponibles (tipos, condiciones, propietarios)
 */
export const getLibraryFilters = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Tipos de juego disponibles
    const gameTypes = Object.values(GameType);

    // Condiciones disponibles
    const conditions = Object.values(GameCondition);

    // Propietarios únicos
    const owners = await prisma.libraryItem.findMany({
      where: { ownerEmail: { not: null } },
      select: { ownerEmail: true },
      distinct: ['ownerEmail']
    });

    const uniqueOwners = owners.map(o => o.ownerEmail).filter(Boolean);

    res.json({
      success: true,
      data: {
        gameTypes,
        conditions,
        owners: ['club', ...uniqueOwners]
      }
    });
  } catch (error) {
    console.error('Error al obtener filtros:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener filtros'
    });
  }
};
