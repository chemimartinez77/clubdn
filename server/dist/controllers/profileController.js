"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMyProfile = exports.getUserProfile = exports.getMyProfile = void 0;
const database_1 = require("../config/database");
/**
 * Obtener el perfil del usuario autenticado
 */
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        // Buscar o crear perfil
        let profile = await database_1.prisma.userProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        status: true,
                        createdAt: true,
                        lastLoginAt: true
                    }
                }
            }
        });
        // Si no existe el perfil, crearlo con valores por defecto
        if (!profile) {
            profile = await database_1.prisma.userProfile.create({
                data: {
                    userId,
                    favoriteGames: [],
                    notifications: true,
                    emailUpdates: true
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            status: true,
                            createdAt: true,
                            lastLoginAt: true
                        }
                    }
                }
            });
        }
        res.status(200).json({
            success: true,
            data: { profile }
        });
    }
    catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil'
        });
    }
};
exports.getMyProfile = getMyProfile;
/**
 * Obtener perfil de cualquier usuario (público)
 */
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const profile = await database_1.prisma.userProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        status: true,
                        createdAt: true
                    }
                }
            }
        });
        if (!profile) {
            res.status(404).json({
                success: false,
                message: 'Perfil no encontrado'
            });
            return;
        }
        // Ocultar información sensible si no es el propio usuario
        const isOwnProfile = req.user?.userId === userId;
        const sanitizedProfile = {
            ...profile,
            phone: isOwnProfile ? profile.phone : null,
            notifications: isOwnProfile ? profile.notifications : undefined,
            emailUpdates: isOwnProfile ? profile.emailUpdates : undefined
        };
        res.status(200).json({
            success: true,
            data: { profile: sanitizedProfile }
        });
    }
    catch (error) {
        console.error('Error al obtener perfil de usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil'
        });
    }
};
exports.getUserProfile = getUserProfile;
/**
 * Actualizar perfil del usuario autenticado
 */
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        const { avatar, phone, birthDate, bio, favoriteGames, playStyle, discord, telegram, notifications, emailUpdates } = req.body;
        // Buscar o crear perfil
        let profile = await database_1.prisma.userProfile.findUnique({
            where: { userId }
        });
        if (!profile) {
            // Crear perfil si no existe
            profile = await database_1.prisma.userProfile.create({
                data: {
                    userId,
                    avatar,
                    phone,
                    birthDate: birthDate ? new Date(birthDate) : null,
                    bio,
                    favoriteGames: favoriteGames || [],
                    playStyle,
                    discord,
                    telegram,
                    notifications: notifications ?? true,
                    emailUpdates: emailUpdates ?? true
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            status: true,
                            createdAt: true,
                            lastLoginAt: true
                        }
                    }
                }
            });
        }
        else {
            // Actualizar perfil existente
            profile = await database_1.prisma.userProfile.update({
                where: { userId },
                data: {
                    ...(avatar !== undefined && { avatar }),
                    ...(phone !== undefined && { phone }),
                    ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                    ...(bio !== undefined && { bio }),
                    ...(favoriteGames !== undefined && { favoriteGames }),
                    ...(playStyle !== undefined && { playStyle }),
                    ...(discord !== undefined && { discord }),
                    ...(telegram !== undefined && { telegram }),
                    ...(notifications !== undefined && { notifications }),
                    ...(emailUpdates !== undefined && { emailUpdates })
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            status: true,
                            createdAt: true,
                            lastLoginAt: true
                        }
                    }
                }
            });
        }
        res.status(200).json({
            success: true,
            data: { profile },
            message: 'Perfil actualizado correctamente'
        });
    }
    catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar perfil'
        });
    }
};
exports.updateMyProfile = updateMyProfile;
//# sourceMappingURL=profileController.js.map