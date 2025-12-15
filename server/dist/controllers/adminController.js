"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectUser = exports.approveUser = exports.getPendingApprovals = void 0;
const database_1 = require("../config/database");
const emailService_1 = require("../services/emailService");
/**
 * Listar solicitudes pendientes de aprobaci�n
 * GET /api/admin/pending-approvals
 */
const getPendingApprovals = async (_req, res) => {
    try {
        const pendingUsers = await database_1.prisma.user.findMany({
            where: {
                status: 'PENDING_APPROVAL',
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                status: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.status(200).json({
            success: true,
            data: pendingUsers,
        });
    }
    catch (error) {
        console.error('Error al obtener solicitudes pendientes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las solicitudes pendientes',
        });
    }
};
exports.getPendingApprovals = getPendingApprovals;
/**
 * Aprobar usuario
 * POST /api/admin/approve/:userId
 */
const approveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { customMessage } = req.body;
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
            });
        }
        // Buscar usuario
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }
        // Verificar que est� pendiente de aprobaci�n
        if (user.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Este usuario no est� pendiente de aprobaci�n',
            });
        }
        // Actualizar usuario
        await database_1.prisma.user.update({
            where: { id: userId },
            data: {
                status: 'APPROVED',
                approvedBy: adminId,
                approvedAt: new Date(),
            },
        });
        // Enviar email de aprobaci�n
        await (0, emailService_1.sendApprovalEmail)(user.email, user.name, customMessage);
        return res.status(200).json({
            success: true,
            message: 'Usuario aprobado exitosamente',
        });
    }
    catch (error) {
        console.error('Error al aprobar usuario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al aprobar el usuario',
        });
    }
};
exports.approveUser = approveUser;
/**
 * Rechazar usuario
 * POST /api/admin/reject/:userId
 */
const rejectUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, customMessage } = req.body;
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
            });
        }
        // Buscar usuario
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }
        // Verificar que est� pendiente de aprobaci�n
        if (user.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Este usuario no est� pendiente de aprobaci�n',
            });
        }
        // Actualizar usuario
        await database_1.prisma.user.update({
            where: { id: userId },
            data: {
                status: 'REJECTED',
                rejectedBy: adminId,
                rejectedAt: new Date(),
                rejectionReason: reason || null,
            },
        });
        // Enviar email de rechazo
        await (0, emailService_1.sendRejectionEmail)(user.email, user.name, reason, customMessage);
        return res.status(200).json({
            success: true,
            message: 'Usuario rechazado',
        });
    }
    catch (error) {
        console.error('Error al rechazar usuario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al rechazar el usuario',
        });
    }
};
exports.rejectUser = rejectUser;
//# sourceMappingURL=adminController.js.map