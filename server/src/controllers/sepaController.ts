// server/src/controllers/sepaController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

const CLUB_NAME = process.env.SEPA_CLUB_NAME || 'CLUB DREADNOUGHT';
const CLUB_IBAN = process.env.SEPA_CLUB_IBAN || '';
const CLUB_CREDITOR_ID = process.env.SEPA_CREDITOR_ID || 'ES97001G02953248';
const MEMBERSHIP_FEES: Record<string, number> = {
  SOCIO: 20,
  COLABORADOR: 16,
  FAMILIAR: 8,
};

const pad = (str: string, len: number, char = ' ', right = false): string => {
  const s = String(str ?? '').slice(0, len);
  return right ? s.padEnd(len, char) : s.padStart(len, char);
};

const padRight = (str: string, len: number) => pad(str, len, ' ', true);
const padLeft = (str: string, len: number, char = '0') => pad(str, len, char, false);

const formatDateYYYYMMDD = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

const normalizeIban = (iban: string) => iban.replace(/\s+/g, '').toUpperCase();

const amountCents = (eur: number) => Math.round(eur * 100);

/**
 * GET /api/membership/sepa-remesa?month=M&year=Y
 * Genera el fichero Norma 19 (SEPA Direct Debit) para el mes indicado.
 */
export const generateSepaRemesa = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();

    if (month < 1 || month > 12 || isNaN(year)) {
      res.status(400).json({ success: false, message: 'Mes o año no válido' });
      return;
    }

    // Fecha de cargo: primer día hábil del mes solicitado (usamos el día 1)
    const chargeDate = new Date(year, month - 1, 1);
    const chargeDateStr = formatDateYYYYMMDD(chargeDate);
    // Fecha de creación: hoy
    const creationDate = formatDateYYYYMMDD(now);
    // Fecha de presentación al banco: hoy
    const presentationDate = formatDateYYYYMMDD(now);

    // Recuperar todos los miembros activos con IBAN y mandato SEPA configurado
    const memberships = await prisma.membership.findMany({
      where: {
        fechaBaja: null,
        sepaMandateRef: { not: null },
        sepaMandateDate: { not: null },
        type: { in: ['SOCIO', 'COLABORADOR', 'FAMILIAR'] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: {
              select: { firstName: true, lastName: true, iban: true },
            },
            payments: {
              select: { month: true, year: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filtrar los que ya han pagado este mes
    const toCobrar = memberships.filter((m) => {
      const alreadyPaid = m.user.payments.some((p) => p.month === month && p.year === year);
      return !alreadyPaid && m.user.profile?.iban;
    });

    if (toCobrar.length === 0) {
      res.status(400).json({ success: false, message: 'No hay miembros con domiciliación SEPA configurada pendientes de cobro para este período' });
      return;
    }

    const totalImporte = toCobrar.reduce((sum, m) => sum + (MEMBERSHIP_FEES[m.type] ?? 0), 0);
    const totalCents = amountCents(totalImporte);
    const numRecords = toCobrar.length;

    const lines: string[] = [];

    // Registro 01 — Cabecera presentador
    const r01 =
      '01' +
      padLeft('19143001', 8) +
      padRight(CLUB_CREDITOR_ID, 35) +
      padRight(CLUB_NAME, 70) +
      ' '.repeat(6) +
      presentationDate +
      'PRE' +
      creationDate +
      padLeft(String(numRecords + 4), 9, '0') + // total registros incluyendo cabeceras y totales
      padLeft(String(numRecords), 9, '0') +
      padLeft(String(totalCents), 12, '0') +
      ' '.repeat(204);
    lines.push(r01.slice(0, 400));

    // Registro 02 — Cabecera ordenante
    const clubIbanNorm = normalizeIban(CLUB_IBAN);
    const r02 =
      '02' +
      padLeft('19143002', 8) +
      padRight(CLUB_CREDITOR_ID, 35) +
      presentationDate +
      padRight(CLUB_NAME, 70) +
      ' '.repeat(118) +
      padRight(clubIbanNorm, 34) +
      ' '.repeat(10) +
      padLeft(String(numRecords), 9, '0') +
      ' '.repeat(104);
    lines.push(r02.slice(0, 400));

    // Registros 03 — un adeudo por miembro
    for (const m of toCobrar) {
      const fee = MEMBERSHIP_FEES[m.type] ?? 0;
      const cents = amountCents(fee);
      const iban = normalizeIban(m.user.profile!.iban!);
      const mandateRef = m.sepaMandateRef!;
      const mandateDate = formatDateYYYYMMDD(m.sepaMandateDate!);

      // Determinar FRST o RCUR: FRST si no hay pagos anteriores registrados
      const hasPrior = m.user.payments.some((p) => p.year < year || (p.year === year && p.month < month));
      const seqType = hasPrior ? 'RCUR' : 'FRST';

      const nameParts = m.user.name.trim().split(/\s+/);
      const firstName = m.user.profile?.firstName || nameParts[0] || '';
      const lastName = m.user.profile?.lastName || nameParts.slice(1).join(' ') || '';
      const fullName = `${firstName} ${lastName}`.toUpperCase().trim();

      const r03 =
        '03' +
        padLeft('19143003', 8) +
        padRight(mandateRef, 35) +
        padRight(mandateRef, 35) +
        padRight(seqType, 8) +
        padLeft(String(cents), 11, '0') +
        '0' + // imponible IVA (0)
        mandateDate +
        ' '.repeat(11) +
        padRight(fullName, 70) +
        ' '.repeat(118) +
        'A' +
        padRight(iban, 34) +
        ' '.repeat(14) +
        padRight(m.type, 140);
      lines.push(r03.slice(0, 400));
    }

    // Registro 04 — Total ordenante
    const r04 =
      '04' +
      padRight(CLUB_CREDITOR_ID, 35) +
      ' '.repeat(11) +
      chargeDateStr +
      padLeft(String(totalCents), 12, '0') +
      padLeft(String(0), 12, '0') +
      padLeft(String(numRecords), 9, '0') +
      padLeft(String(totalCents), 12, '0') +
      ' '.repeat(299);
    lines.push(r04.slice(0, 400));

    // Registro 05 — Total general
    const r05 =
      '05' +
      padRight(CLUB_CREDITOR_ID, 35) +
      ' '.repeat(11) +
      padLeft(String(totalCents), 12, '0') +
      padLeft(String(0), 12, '0') +
      padLeft(String(numRecords), 9, '0') +
      padLeft(String(totalCents), 12, '0') +
      ' '.repeat(299);
    lines.push(r05.slice(0, 400));

    // Registro 99 — Fin de fichero
    const totalLines = lines.length + 1;
    const r99 =
      '99' +
      padLeft(String(totalCents), 12, '0') +
      padLeft(String(0), 12, '0') +
      padLeft(String(numRecords), 9, '0') +
      padLeft(String(totalLines), 9, '0') +
      ' '.repeat(354);
    lines.push(r99.slice(0, 400));

    const filename = `remesa_sepa_${year}${String(month).padStart(2, '0')}.txt`;
    const content = lines.join('\r\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error('Error generando remesa SEPA:', error);
    res.status(500).json({ success: false, message: 'Error al generar la remesa SEPA' });
  }
};
