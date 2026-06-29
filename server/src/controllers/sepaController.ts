// server/src/controllers/sepaController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

const CLUB_NAME = process.env.SEPA_CLUB_NAME || 'CLUB DREADNOUGHT';
const CLUB_IBAN = process.env.SEPA_CLUB_IBAN || '';
const CLUB_CREDITOR_ID = process.env.SEPA_CREDITOR_ID || 'ES97001G02953248';

const COBRABLE_TYPES = ['SOCIO', 'COLABORADOR', 'FAMILIAR'] as const;

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const normalizeIban = (iban: string) => iban.replace(/\s+/g, '').toUpperCase();

// Fecha en formato YYYY-MM-DD (ISO local, sin desfase de zona horaria)
const formatDateISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Fecha-hora ISO sin milisegundos ni zona (pain.008 CreDtTm)
const formatDateTime = (d: Date) => formatDateISO(d) + `T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

// Importe con 2 decimales y punto como separador
const formatAmount = (eur: number) => eur.toFixed(2);

// Escapa caracteres reservados de XML
const xmlEscape = (str: string) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Lee los precios de cuota desde ClubConfig.membershipTypes.
 * Devuelve un mapa { SOCIO: 20, COLABORADOR: 16, FAMILIAR: 8, ... }.
 */
const getMembershipFees = async (): Promise<Record<string, number>> => {
  const config = await prisma.clubConfig.findUnique({ where: { id: 'club_config' } });
  const fees: Record<string, number> = {};
  if (config && Array.isArray(config.membershipTypes)) {
    for (const entry of config.membershipTypes as Array<{ type?: string; price?: number }>) {
      if (entry && typeof entry.type === 'string' && typeof entry.price === 'number') {
        fees[entry.type] = entry.price;
      }
    }
  }
  return fees;
};

/**
 * GET /api/membership/sepa-sin-mandato
 * Devuelve socios activos con IBAN pero sin mandato SEPA configurado.
 */
export const getSepaSinMandato = async (_req: Request, res: Response): Promise<void> => {
  try {
    const memberships = await prisma.membership.findMany({
      where: {
        fechaBaja: null,
        type: { in: ['SOCIO', 'COLABORADOR', 'FAMILIAR'] },
        OR: [
          { sepaMandateRef: null },
          { sepaMandateDate: null },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: {
              select: { firstName: true, lastName: true, iban: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Solo los que tienen IBAN
    const conIban = memberships.filter((m) => !!m.user.profile?.iban);

    const result = conIban.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      firstName: m.user.profile?.firstName || '',
      lastName: m.user.profile?.lastName || '',
      iban: m.user.profile!.iban,
      membershipType: m.type,
      hasMandateRef: !!m.sepaMandateRef,
      hasMandateDate: !!m.sepaMandateDate,
    }));

    res.json({ success: true, data: { total: result.length, members: result } });
  } catch (error) {
    console.error('Error obteniendo socios sin mandato SEPA:', error);
    res.status(500).json({ success: false, message: 'Error al obtener socios sin mandato SEPA' });
  }
};

interface SepaDebtor {
  fullName: string;
  iban: string;
  amount: number;
  mandateRef: string;
  mandateDate: Date;
  concept: string;
  seqType: 'FRST' | 'RCUR';
}

/**
 * GET /api/membership/sepa-xml?month=M&year=Y
 * Genera el fichero SEPA XML (pain.008.001.02, adeudo directo CORE) para el mes indicado.
 * Incluye a todos los miembros activos con IBAN y mandato (ref + fecha) que no hayan pagado el mes.
 */
export const generateSepaXml = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(String(req.query.month)) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(String(req.query.year)) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
      res.status(400).json({ success: false, message: 'Mes o año no válido' });
      return;
    }

    if (!CLUB_IBAN) {
      res.status(500).json({ success: false, message: 'Variable de entorno SEPA_CLUB_IBAN no configurada. Configúrala en Railway con el IBAN del club.' });
      return;
    }

    const fees = await getMembershipFees();

    const chargeDate = new Date(year, month - 1, 1);
    const conceptMonth = `${MONTH_NAMES[month - 1]} ${year}`;

    const memberships = await prisma.membership.findMany({
      where: {
        fechaBaja: null,
        type: { in: [...COBRABLE_TYPES] },
        sepaMandateRef: { not: null },
        sepaMandateDate: { not: null },
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

    const debtors: SepaDebtor[] = [];
    for (const m of memberships) {
      const iban = m.user.profile?.iban;
      if (!iban) continue;

      const alreadyPaid = m.user.payments.some((p) => p.month === month && p.year === year);
      if (alreadyPaid) continue;

      const amount = fees[m.type] ?? 0;
      if (amount <= 0) continue;

      const nameParts = m.user.name.trim().split(/\s+/);
      const firstName = m.user.profile?.firstName || nameParts[0] || '';
      const lastName = m.user.profile?.lastName || nameParts.slice(1).join(' ') || '';
      const fullName = `${firstName} ${lastName}`.trim() || m.user.name.trim();

      // FRST si no hay ningún pago anterior registrado; RCUR en caso contrario
      const hasPrior = m.user.payments.some((p) => p.year < year || (p.year === year && p.month < month));

      debtors.push({
        fullName,
        iban: normalizeIban(iban),
        amount,
        mandateRef: m.sepaMandateRef!,
        mandateDate: m.sepaMandateDate!,
        concept: `Cuota ${m.type} ${conceptMonth}`.slice(0, 140),
        seqType: hasPrior ? 'RCUR' : 'FRST',
      });
    }

    if (debtors.length === 0) {
      res.status(400).json({ success: false, message: 'No hay miembros con mandato SEPA pendientes de cobro para este período' });
      return;
    }

    const clubIban = normalizeIban(CLUB_IBAN);
    const msgId = `DN-${formatDateISO(now).replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;
    const totalAmount = debtors.reduce((sum, d) => sum + d.amount, 0);
    const reqdColltnDt = formatDateISO(chargeDate);

    // pain.008 agrupa la secuencia (FRST/RCUR) a nivel de PmtInf,
    // así que generamos un bloque PmtInf por cada tipo de secuencia presente.
    const seqGroups: Array<'FRST' | 'RCUR'> = ['FRST', 'RCUR'];
    const pmtInfBlocks: string[] = [];
    let pmtInfCounter = 0;

    for (const seqType of seqGroups) {
      const group = debtors.filter((d) => d.seqType === seqType);
      if (group.length === 0) continue;
      pmtInfCounter += 1;

      const groupSum = group.reduce((sum, d) => sum + d.amount, 0);
      const pmtInfId = `${msgId}-${seqType}`;

      const txs = group.map((d, idx) => `
      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${xmlEscape(`${pmtInfId}-${idx + 1}`)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${formatAmount(d.amount)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${xmlEscape(d.mandateRef)}</MndtId>
            <DtOfSgntr>${formatDateISO(d.mandateDate)}</DtOfSgntr>
            <AmdmntInd>false</AmdmntInd>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            <Othr>
              <Id>NOTPROVIDED</Id>
            </Othr>
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${xmlEscape(d.fullName.slice(0, 70))}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${xmlEscape(d.iban)}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>${xmlEscape(d.concept)}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`).join('');

      pmtInfBlocks.push(`
    <PmtInf>
      <PmtInfId>${xmlEscape(pmtInfId)}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${group.length}</NbOfTxs>
      <CtrlSum>${formatAmount(groupSum)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>CORE</Cd>
        </LclInstrm>
        <SeqTp>${seqType}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${reqdColltnDt}</ReqdColltnDt>
      <Cdtr>
        <Nm>${xmlEscape(CLUB_NAME)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${xmlEscape(clubIban)}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <Othr>
            <Id>NOTPROVIDED</Id>
          </Othr>
        </FinInstnId>
      </CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${xmlEscape(CLUB_CREDITOR_ID)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>${txs}
    </PmtInf>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${xmlEscape(msgId)}</MsgId>
      <CreDtTm>${formatDateTime(now)}</CreDtTm>
      <NbOfTxs>${debtors.length}</NbOfTxs>
      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>
      <InitgPty>
        <Nm>${xmlEscape(CLUB_NAME)}</Nm>
      </InitgPty>
    </GrpHdr>${pmtInfBlocks.join('')}
  </CstmrDrctDbtInitn>
</Document>`;

    const filename = `sepa_${year}${String(month).padStart(2, '0')}.xml`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (error) {
    console.error('Error generando XML SEPA:', error);
    res.status(500).json({ success: false, message: 'Error al generar el XML SEPA' });
  }
};
