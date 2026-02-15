// server/src/services/emailService.ts
// Servicio de emails usando Resend
import axios from 'axios';
import { prisma } from '../config/database';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Club DN <no-reply@clubdn.es>';
const resendApiUrl = 'https://api.resend.com/emails';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  template: string;
}

/**
 * Función base para enviar emails
 */
export const sendEmail = async (options: EmailOptions) => {
  try {
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY no configurada');
    }

    const response = await axios.post(
      resendApiUrl,
      {
        from: resendFrom,
        to: options.to,
        subject: options.subject,
        html: options.html
      },
      {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    // Log exitoso
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template,
        success: true
      },
    });

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    // Log con error
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template,
        success: false,
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
};

/**
 * Email de verificación de cuenta
 */
export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string
) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎲 Club DN</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #667eea; margin-top: 0;">¡Hola ${name}!</h2>
          
          <p>Gracias por registrarte en nuestro club de juegos de mesa.</p>
          
          <p>Para completar tu registro, por favor verifica tu email haciendo clic en el siguiente botón:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #667eea; 
                      color: white; 
                      padding: 14px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      display: inline-block;
                      font-weight: bold;
                      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
              Verificar Email
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Este enlace expirará en <strong>24 horas</strong>.
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            Si no solicitaste este registro, puedes ignorar este email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            Saludos,<br>
            <strong>El equipo del Club DN</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verifica tu email - Club DN',
    html,
    template: 'verification',
  });
};

/**
 * Notificación al admin de nueva solicitud
 */
export const sendAdminNotification = async (
  adminEmail: string,
  userName: string,
  userEmail: string
) => {
  const adminUrl = `${process.env.CLIENT_URL}/admin/pending-approvals`;
  const currentDate = new Date().toLocaleString('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Nueva Solicitud</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #d97706; margin-top: 0;">Solicitud Pendiente de Aprobación</h2>
          
          <p>Hay una nueva solicitud de registro esperando tu revisión:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>👤 Nombre:</strong> ${userName}</p>
            <p style="margin: 10px 0;"><strong>📧 Email:</strong> ${userEmail}</p>
            <p style="margin: 10px 0;"><strong>📅 Fecha:</strong> ${currentDate}</p>
          </div>
          
          <p>Accede al panel de administración para aprobar o rechazar esta solicitud:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}" 
               style="background-color: #f59e0b; 
                      color: white; 
                      padding: 14px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      display: inline-block;
                      font-weight: bold;
                      box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
              Ver Panel de Admin
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            Sistema automático del Club DN
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject: '🔔 Nueva solicitud de registro - Club DN',
    html,
    template: 'admin_notification',
  });
};

/**
 * Email de aprobación de solicitud
 */
export const sendApprovalEmail = async (
  email: string,
  name: string,
  customMessage?: string
) => {
  const loginUrl = `${process.env.CLIENT_URL}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🎉</h1>
          <h2 style="color: white; margin: 10px 0; font-size: 28px;">¡Bienvenido al Club!</h2>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #059669; margin-top: 0;">¡Hola ${name}!</h2>
          
          <p style="font-size: 18px; color: #10b981; font-weight: bold;">
            ¡Excelentes noticias! Tu solicitud ha sido aprobada.
          </p>
          
          <p>Ya puedes acceder a la plataforma y disfrutar de todas las funcionalidades del club:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #10b981; 
                      color: white; 
                      padding: 14px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      display: inline-block;
                      font-weight: bold;
                      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
              Iniciar Sesión
            </a>
          </div>
          
          ${customMessage ? `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7; margin: 20px 0;">
              <p style="margin: 0; color: #0c4a6e;">
                <strong>Mensaje del administrador:</strong><br>
                ${customMessage}
              </p>
            </div>
          ` : ''}
          
          <p>¡Te esperamos en la próxima sesión de juegos!</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            Saludos,<br>
            <strong>El equipo del Club DN</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🎉 ¡Bienvenido al Club Dreadnought!',
    html,
    template: 'approval',
  });
};

/**
 * Email de rechazo de solicitud
 */
export const sendRejectionEmail = async (
  email: string,
  name: string,
  reason?: string,
  customMessage?: string
) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Actualización de tu Solicitud</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Hola ${name},</h2>
          
          <p>Lamentamos informarte que tu solicitud para unirte al club no ha sido aprobada en este momento.</p>
          
          ${reason ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; color: #78350f;">
                <strong>Motivo:</strong><br>
                ${reason}
              </p>
            </div>
          ` : ''}
          
          ${customMessage ? `
            <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0;">
              <p style="margin: 0; color: #3730a3;">
                <strong>Mensaje del administrador:</strong><br>
                ${customMessage}
              </p>
            </div>
          ` : ''}
          
          <p>Si tienes alguna pregunta o necesitas más información, no dudes en contactarnos.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            Saludos,<br>
            <strong>El equipo del Club DN</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Actualización sobre tu solicitud - Club DN',
    html,
    template: 'rejection',
  });
};

/**
 * Enviar email de recuperación de contraseña
 */
export const sendPasswordResetEmail = async (email: string, name: string, token: string) => {
  const frontendUrl = process.env.CLIENT_URL || 'https://app.clubdreadnought.org';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de contraseña - Club DN</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
              🔐 Recuperación de Contraseña
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Hola <strong>${name}</strong>,
            </p>

            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Club DN.
            </p>

            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 30px;">
              Haz clic en el botón de abajo para crear una nueva contraseña:
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; background: #6366f1; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Restablecer Contraseña
              </a>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este email.
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Si tienes problemas con el botón, copia y pega este enlace en tu navegador:
            </p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              Saludos,<br>
              <strong>El equipo del Club DN</strong>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Recuperación de contraseña - Club DN',
    html,
    template: 'password_reset',
  });
};

/**
 * Email al organizador sobre solicitud de registro pendiente
 */
export const sendRegistrationPendingEmail = async (
  organizerEmail: string,
  organizerName: string,
  eventTitle: string,
  userName: string,
  eventId: string
) => {
  const eventUrl = `${process.env.CLIENT_URL}/events/${eventId}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Nueva Solicitud de Registro</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #667eea; margin-top: 0;">Hola ${organizerName},</h2>

          <p><strong>${userName}</strong> ha solicitado unirse a tu evento:</p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>📅 Evento:</strong> ${eventTitle}</p>
          </div>

          <p>Accede al evento para aprobar o rechazar esta solicitud:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}"
               style="background-color: #667eea;
                      color: white;
                      padding: 14px 30px;
                      text-decoration: none;
                      border-radius: 5px;
                      display: inline-block;
                      font-weight: bold;
                      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
              Ver Solicitudes Pendientes
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            Saludos,<br>
            <strong>El equipo del Club DN</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: organizerEmail,
    subject: `Nueva solicitud de registro - ${eventTitle}`,
    html,
    template: 'registration_pending',
  });
};

/**
 * Email al usuario notificando aprobación de registro
 */
export const sendRegistrationApprovedEmail = async (
  userEmail: string,
  userName: string,
  eventTitle: string,
  eventId: string
) => {
  const eventUrl = `${process.env.CLIENT_URL}/events/${eventId}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🎉</h1>
          <h2 style="color: white; margin: 10px 0; font-size: 28px;">¡Registro Aprobado!</h2>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #059669; margin-top: 0;">¡Hola ${userName}!</h2>

          <p style="font-size: 18px; color: #10b981; font-weight: bold;">
            Tu solicitud para unirte al evento ha sido aprobada.
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>📅 Evento:</strong> ${eventTitle}</p>
          </div>

          <p>¡Te esperamos en el evento!</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}"
               style="background-color: #10b981;
                      color: white;
                      padding: 14px 30px;
                      text-decoration: none;
                      border-radius: 5px;
                      display: inline-block;
                      font-weight: bold;
                      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
              Ver Detalles del Evento
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            Saludos,<br>
            <strong>El equipo del Club DN</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `¡Registro aprobado! - ${eventTitle}`,
    html,
    template: 'registration_approved',
  });
};

/**
 * Email a admins sobre nuevo reporte
 */
export const sendReportCreatedEmail = async (
  adminEmail: string,
  reportTitle: string,
  reportType: string,
  reporterName: string
) => {
  const reportUrl = `${process.env.CLIENT_URL}/feedback`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Nuevo Reporte</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #d97706; margin-top: 0;">Nuevo ${reportType}</h2>

          <p><strong>${reporterName}</strong> ha creado un nuevo reporte:</p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>📝 Título:</strong> ${reportTitle}</p>
            <p style="margin: 10px 0;"><strong>🏷️ Tipo:</strong> ${reportType}</p>
          </div>

          <p>Revisa y gestiona este reporte en el panel de feedback:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${reportUrl}"
               style="background-color: #f59e0b;
                      color: white;
                      padding: 14px 30px;
                      text-decoration: none;
                      border-radius: 5px;
                      display: inline-block;
                      font-weight: bold;
                      box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
              Ver Reportes
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            Sistema automático del Club DN
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🔔 Nuevo reporte: ${reportTitle}`,
    html,
    template: 'report_created',
  });
};
