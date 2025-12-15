// server/src/scripts/seedMemberships.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de membresías...');

  // Hashear contraseña común para todos los usuarios de prueba
  const password = await bcrypt.hash('Club2024!', 10);

  // Crear usuarios de ejemplo con membresías
  const usersData = [
    // SOCIOS (con más de 1 año como miembros)
    {
      name: 'María García López',
      email: 'maria.garcia@ejemplo.com',
      membershipType: 'SOCIO' as const,
      monthsAsMember: 18,
      hasPaidCurrentMonth: true,
      hasPaidLastMonth: true
    },
    {
      name: 'Carlos Rodríguez Martín',
      email: 'carlos.rodriguez@ejemplo.com',
      membershipType: 'SOCIO' as const,
      monthsAsMember: 24,
      hasPaidCurrentMonth: true,
      hasPaidLastMonth: true
    },
    {
      name: 'Ana Fernández Sánchez',
      email: 'ana.fernandez@ejemplo.com',
      membershipType: 'SOCIO' as const,
      monthsAsMember: 15,
      hasPaidCurrentMonth: false, // Este SOCIO debe un pago
      hasPaidLastMonth: true
    },
    {
      name: 'David López González',
      email: 'david.lopez@ejemplo.com',
      membershipType: 'SOCIO' as const,
      monthsAsMember: 20,
      hasPaidCurrentMonth: true,
      hasPaidLastMonth: true
    },

    // COLABORADORES (con diferentes antigüedades)
    {
      name: 'Laura Martínez Ruiz',
      email: 'laura.martinez@ejemplo.com',
      membershipType: 'COLABORADOR' as const,
      monthsAsMember: 14, // Puede ser promovido a SOCIO
      hasPaidCurrentMonth: true,
      hasPaidLastMonth: true
    },
    {
      name: 'Pedro Sánchez Díaz',
      email: 'pedro.sanchez@ejemplo.com',
      membershipType: 'COLABORADOR' as const,
      monthsAsMember: 8,
      hasPaidCurrentMonth: true,
      hasPaidLastMonth: true
    },
    {
      name: 'Isabel Torres Moreno',
      email: 'isabel.torres@ejemplo.com',
      membershipType: 'COLABORADOR' as const,
      monthsAsMember: 3,
      hasPaidCurrentMonth: false, // Debe un pago
      hasPaidLastMonth: true
    },
    {
      name: 'Javier Ramírez Castro',
      email: 'javier.ramirez@ejemplo.com',
      membershipType: 'COLABORADOR' as const,
      monthsAsMember: 12, // Justo cumple 1 año, puede ser promovido
      hasPaidCurrentMonth: true,
      hasPaidLastMonth: false
    },
    {
      name: 'Carmen Jiménez Ortiz',
      email: 'carmen.jimenez@ejemplo.com',
      membershipType: 'COLABORADOR' as const,
      monthsAsMember: 6,
      hasPaidCurrentMonth: true,
      hasPaidLastMonth: true
    },
    {
      name: 'Miguel Ángel Romero Gil',
      email: 'miguel.romero@ejemplo.com',
      membershipType: 'COLABORADOR' as const,
      monthsAsMember: 1, // Nuevo miembro
      hasPaidCurrentMonth: true,
      hasPaidLastMonth: false // No tiene mes anterior
    }
  ];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Obtener el admin para registrar como quien aprobó y registró pagos
  const admin = await prisma.user.findFirst({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] }
    }
  });

  if (!admin) {
    console.error('❌ No se encontró un administrador en la base de datos');
    console.log('Por favor, asegúrate de tener al menos un usuario administrador');
    return;
  }

  console.log(`📋 Usando admin ${admin.name} para aprobar usuarios y registrar pagos`);

  for (const userData of usersData) {
    console.log(`\n👤 Creando usuario: ${userData.name}`);

    // Calcular fecha de inicio basada en meses como miembro
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - userData.monthsAsMember);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password,
        role: 'USER',
        status: 'APPROVED',
        emailVerified: true,
        approvedBy: admin.id,
        approvedAt: new Date(),
        createdAt: startDate
      }
    });

    console.log(`  ✅ Usuario creado con ID: ${user.id}`);

    // Crear perfil
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        bio: `Miembro del club desde hace ${userData.monthsAsMember} meses`,
        notifications: true,
        emailUpdates: true
      }
    });

    console.log(`  ✅ Perfil creado`);

    // Crear membresía
    const monthlyFee = userData.membershipType === 'SOCIO' ? 19.00 : 15.00;
    const becameSocioAt = userData.membershipType === 'SOCIO'
      ? new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 año después
      : null;

    await prisma.membership.create({
      data: {
        userId: user.id,
        type: userData.membershipType,
        monthlyFee,
        startDate,
        becameSocioAt,
        isActive: userData.hasPaidCurrentMonth,
        lastPaymentDate: userData.hasPaidCurrentMonth ? new Date() : null
      }
    });

    console.log(`  ✅ Membresía ${userData.membershipType} creada (${monthlyFee}€/mes)`);

    // Crear pagos históricos (últimos 3-5 meses dependiendo de antigüedad)
    const paymentsToCreate = Math.min(userData.monthsAsMember, 5);

    for (let i = 1; i <= paymentsToCreate; i++) {
      const paymentMonth = currentMonth - i;
      let paymentMonthAdjusted = paymentMonth;
      let paymentYear = currentYear;

      if (paymentMonth <= 0) {
        paymentMonthAdjusted = 12 + paymentMonth;
        paymentYear = currentYear - 1;
      }

      // Determinar si debe crear el pago basado en las flags
      let shouldCreatePayment = true;
      if (i === 0 && !userData.hasPaidCurrentMonth) shouldCreatePayment = false;
      if (i === 1 && !userData.hasPaidLastMonth) shouldCreatePayment = false;

      if (shouldCreatePayment) {
        const paymentDate = new Date(paymentYear, paymentMonthAdjusted - 1, Math.floor(Math.random() * 28) + 1);

        await prisma.payment.create({
          data: {
            userId: user.id,
            amount: monthlyFee,
            month: paymentMonthAdjusted,
            year: paymentYear,
            paymentMethod: ['efectivo', 'transferencia', 'bizum'][Math.floor(Math.random() * 3)],
            reference: `REF-${paymentYear}${paymentMonthAdjusted.toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`,
            registeredBy: admin.id,
            paidAt: paymentDate
          }
        });

        console.log(`  💰 Pago creado: ${paymentMonthAdjusted}/${paymentYear}`);
      }
    }

    // Crear pago del mes actual si corresponde
    if (userData.hasPaidCurrentMonth) {
      await prisma.payment.create({
        data: {
          userId: user.id,
          amount: monthlyFee,
          month: currentMonth,
          year: currentYear,
          paymentMethod: ['efectivo', 'transferencia', 'bizum'][Math.floor(Math.random() * 3)],
          reference: `REF-${currentYear}${currentMonth.toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`,
          registeredBy: admin.id,
          paidAt: new Date()
        }
      });

      console.log(`  💰 Pago del mes actual creado`);
    } else {
      console.log(`  ⚠️  Sin pago del mes actual`);
    }
  }

  console.log('\n✨ Seed completado exitosamente!');
  console.log('\n📊 Resumen:');
  console.log(`- ${usersData.filter(u => u.membershipType === 'SOCIO').length} SOCIOS creados`);
  console.log(`- ${usersData.filter(u => u.membershipType === 'COLABORADOR').length} COLABORADORES creados`);
  console.log(`- ${usersData.filter(u => u.monthsAsMember >= 12 && u.membershipType === 'COLABORADOR').length} COLABORADORES elegibles para promoción a SOCIO`);
  console.log(`- ${usersData.filter(u => !u.hasPaidCurrentMonth).length} miembros con pago pendiente`);
  console.log('\n🔐 Contraseña para todos los usuarios: Club2024!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
