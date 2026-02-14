// server/src/controllers/financialController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

// ==================== CATEGORÍAS ====================

// Obtener todas las categorías
export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.financialCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { movements: true }
        }
      }
    });

    return res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching financial categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las categorías'
    });
  }
};

// Crear una nueva categoría
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio'
      });
    }

    // Verificar que no exista una categoría con el mismo nombre
    const existing = await prisma.financialCategory.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    const category = await prisma.financialCategory.create({
      data: {
        name,
        icon: icon || '💰',
        color: color || 'bg-blue-100 text-blue-800',
        showInBalance: true
      }
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: 'Categoría creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating financial category:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la categoría'
    });
  }
};

// Actualizar una categoría
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, icon, color, showInBalance } = req.body;

    const category = await prisma.financialCategory.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Si se cambia el nombre, verificar que no exista otra con ese nombre
    if (name && name !== category.name) {
      const existing = await prisma.financialCategory.findUnique({
        where: { name }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }
    }

    const updatedCategory = await prisma.financialCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(color && { color }),
        ...(showInBalance !== undefined && { showInBalance })
      }
    });

    return res.json({
      success: true,
      data: updatedCategory,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating financial category:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la categoría'
    });
  }
};

// Eliminar una categoría
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.financialCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movements: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // No permitir eliminar si tiene movimientos
    if (category._count.movements > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una categoría con movimientos asociados'
      });
    }

    await prisma.financialCategory.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting financial category:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la categoría'
    });
  }
};

// ==================== MOVIMIENTOS ====================

// Obtener movimientos con filtros
export const getMovements = async (req: Request, res: Response) => {
  try {
    const { year, month, categoryId } = req.query;

    const where: any = {};

    if (year) {
      where.year = parseInt(year as string);
    }

    if (month) {
      where.month = parseInt(month as string);
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    const movements = await prisma.financialMovement.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('Error fetching financial movements:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los movimientos'
    });
  }
};

// Crear un nuevo movimiento
export const createMovement = async (req: Request, res: Response) => {
  try {
    const { categoryId, amount, description, date } = req.body;
    const userId = req.user!.userId;

    if (!categoryId || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Categoría, monto y fecha son obligatorios'
      });
    }

    // Verificar que la categoría existe
    const category = await prisma.financialCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Parsear la fecha
    const movementDate = new Date(date);
    const year = movementDate.getFullYear();
    const month = movementDate.getMonth() + 1; // 0-11 -> 1-12

    const movement = await prisma.financialMovement.create({
      data: {
        categoryId,
        amount: parseFloat(amount),
        description: description || null,
        date: movementDate,
        year,
        month,
        createdBy: userId
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: movement,
      message: 'Movimiento creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating financial movement:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el movimiento'
    });
  }
};

// Actualizar un movimiento
export const updateMovement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId, amount, description, date } = req.body;

    const movement = await prisma.financialMovement.findUnique({
      where: { id }
    });

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado'
      });
    }

    // Si se cambia la fecha, recalcular year y month
    let year = movement.year;
    let month = movement.month;
    let movementDate = movement.date;

    if (date) {
      movementDate = new Date(date);
      year = movementDate.getFullYear();
      month = movementDate.getMonth() + 1;
    }

    const updatedMovement = await prisma.financialMovement.update({
      where: { id },
      data: {
        ...(categoryId && { categoryId }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(date && { date: movementDate, year, month })
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.json({
      success: true,
      data: updatedMovement,
      message: 'Movimiento actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating financial movement:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el movimiento'
    });
  }
};

// Eliminar un movimiento
export const deleteMovement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const movement = await prisma.financialMovement.findUnique({
      where: { id }
    });

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado'
      });
    }

    await prisma.financialMovement.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Movimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting financial movement:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el movimiento'
    });
  }
};

// ==================== ESTADÍSTICAS Y BALANCE ====================

// Obtener balance anual por categorías
export const getAnnualBalance = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'El año es obligatorio'
      });
    }

    const selectedYear = parseInt(year as string);

    // Obtener todas las categorías que se muestran en balance
    const categories = await prisma.financialCategory.findMany({
      where: { showInBalance: true },
      orderBy: { name: 'asc' }
    });

    // Obtener todos los movimientos del año
    const movements = await prisma.financialMovement.findMany({
      where: {
        year: selectedYear,
        category: {
          showInBalance: true
        }
      },
      include: {
        category: true
      }
    });

    // Crear estructura de balance por categoría y mes
    const balanceByCategory = categories.map(category => {
      const categoryMovements = movements.filter(m => m.categoryId === category.id);

      // Array de 12 meses inicializado en 0
      const monthlyTotals = Array(12).fill(0);

      categoryMovements.forEach(movement => {
        const monthIndex = movement.month - 1; // 1-12 -> 0-11
        monthlyTotals[monthIndex] += movement.amount;
      });

      const totalYear = monthlyTotals.reduce((sum, amount) => sum + amount, 0);

      return {
        category: {
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color
        },
        monthlyTotals,
        totalYear,
        transactionCount: categoryMovements.length
      };
    });

    // Totales por mes (suma de todas las categorías)
    const monthlyTotals = Array(12).fill(0);
    balanceByCategory.forEach(catBalance => {
      catBalance.monthlyTotals.forEach((amount, index) => {
        monthlyTotals[index] += amount;
      });
    });

    const totalYear = monthlyTotals.reduce((sum, amount) => sum + amount, 0);

    return res.json({
      success: true,
      data: {
        year: selectedYear,
        categories: balanceByCategory,
        monthlyTotals,
        totalYear
      }
    });
  } catch (error) {
    console.error('Error fetching annual balance:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el balance anual'
    });
  }
};

// Obtener estadísticas generales
export const getStatistics = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'El año es obligatorio'
      });
    }

    const selectedYear = parseInt(year as string);

    // Total de movimientos
    const totalMovements = await prisma.financialMovement.count({
      where: { year: selectedYear }
    });

    // Suma de ingresos (movimientos positivos)
    const incomesResult = await prisma.financialMovement.aggregate({
      where: {
        year: selectedYear,
        amount: { gt: 0 }
      },
      _sum: {
        amount: true
      }
    });

    // Suma de gastos (movimientos negativos)
    const expensesResult = await prisma.financialMovement.aggregate({
      where: {
        year: selectedYear,
        amount: { lt: 0 }
      },
      _sum: {
        amount: true
      }
    });

    const totalIncomes = incomesResult._sum.amount || 0;
    const totalExpenses = Math.abs(expensesResult._sum.amount || 0);
    const balance = totalIncomes - totalExpenses;

    return res.json({
      success: true,
      data: {
        year: selectedYear,
        totalMovements,
        totalIncomes,
        totalExpenses,
        balance
      }
    });
  } catch (error) {
    console.error('Error fetching financial statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas'
    });
  }
};
