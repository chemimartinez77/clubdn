"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
                status: {
                    in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                status: true,
                approvedByAdmin: {
                    select: {
                        name: true,
                    },
                },
                rejectedByAdmin: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.status(200).json({
            success: true,
            data: pendingUsers.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                status: user.status,
                approvedByName: user.approvedByAdmin?.name || null,
                rejectedByName: user.rejectedByAdmin?.name || null,
            })),
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
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId requerido',
            });
        }
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
        // Verificar que está pendiente de aprobación
        if (user.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Este usuario no está pendiente de aprobación',
            });
        }
        const userEmail = user.email;
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'El usuario no tiene email'
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
        const displayName = user.name ?? 'Usuario';
        await (0, emailService_1.sendApprovalEmail)(userEmail, displayName, customMessage);
        // Notificar al usuario
        const { notifyUserApproved } = await Promise.resolve().then(() => __importStar(require('../services/notificationService')));
        await notifyUserApproved(userId, displayName);
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
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId requerido',
            });
        }
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
        const userEmail = user.email;
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'El usuario no tiene email'
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
        const displayName = user.name ?? 'Usuario';
        await (0, emailService_1.sendRejectionEmail)(userEmail, displayName, reason, customMessage);
        // Notificar al usuario
        const { notifyUserRejected } = await Promise.resolve().then(() => __importStar(require('../services/notificationService')));
        await notifyUserRejected(userId, displayName, reason);
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