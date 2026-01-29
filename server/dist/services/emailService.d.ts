interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    template: string;
}
/**
 * Función base para enviar emails
 */
export declare const sendEmail: (options: EmailOptions) => Promise<{
    success: boolean;
    messageId: any;
}>;
/**
 * Email de verificación de cuenta
 */
export declare const sendVerificationEmail: (email: string, name: string, token: string) => Promise<{
    success: boolean;
    messageId: any;
}>;
/**
 * Notificación al admin de nueva solicitud
 */
export declare const sendAdminNotification: (adminEmail: string, userName: string, userEmail: string) => Promise<{
    success: boolean;
    messageId: any;
}>;
/**
 * Email de aprobación de solicitud
 */
export declare const sendApprovalEmail: (email: string, name: string, customMessage?: string) => Promise<{
    success: boolean;
    messageId: any;
}>;
/**
 * Email de rechazo de solicitud
 */
export declare const sendRejectionEmail: (email: string, name: string, reason?: string, customMessage?: string) => Promise<{
    success: boolean;
    messageId: any;
}>;
/**
 * Enviar email de recuperación de contraseña
 */
export declare const sendPasswordResetEmail: (email: string, name: string, token: string) => Promise<{
    success: boolean;
    messageId: any;
}>;
export {};
//# sourceMappingURL=emailService.d.ts.map