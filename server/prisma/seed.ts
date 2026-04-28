import { PrismaClient, UserRole, UserStatus, MembershipType } from '@prisma/client'

const prisma = new PrismaClient()

function randomFrom<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Array vacío en randomFrom')
  const item = arr[Math.floor(Math.random() * arr.length)]
  if (item === undefined) throw new Error('Item undefined en randomFrom')
  return item
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Nombres y correos de ejemplo
const names = [
  "Pedro Sánchez", "Isabel Torres", "Javier Ramírez", "Carmen Jiménez",
  "Miguel Romero", "María García", "Nacho User", "Chemi Admin",
  "María José", "Laura Pérez", "Antonio Díaz", "Sofía Martínez",
  "Fernando López", "Marta Fernández", "David Ruiz", "Lucía Gómez",
  "Alberto Morales", "Elena Navarro", "Ricardo Herrera", "Patricia Castillo",
  "Carlos Molina", "Sandra Ortega", "Jorge Vega", "Ana Blanco",
  "Luis Jiménez", "Marina Rivas", "Andrés Soto", "Clara Delgado",
  "Raúl Paredes", "Natalia Campos", "Sergio Ramos", "Carla Fuentes",
  "Iván Cruz", "Rocío Gil", "Mario Serrano", "Silvia Cano",
  "Pablo Domínguez", "Verónica Medina", "Joaquín Peña", "Beatriz León",
  "Adrián Romero", "Daniela Castro", "Óscar Torres", "Alba Ruiz",
  "Héctor Morales", "Nuria Campos", "Víctor Gómez", "Elisa Fernández",
  "Félix Hernández", "Celia Rojas", "Gonzalo Navarro", "María Luisa",
  "Tomás Alonso", "Claudia Martín", "Enrique Molina", "Paula Ortiz",
  "Iván Sánchez", "Lorena Díaz", "Rubén Herrera", "Natalia Cruz"
]

async function main() {
  console.log('🌱 Iniciando seed...')
  console.log('🗑️  Limpiando base de datos...')

  // Limpiar datos existentes en orden correcto para evitar violaciones de FK
  await prisma.eventRegistration.deleteMany({})
  await prisma.event.deleteMany({})
  await prisma.payment.deleteMany({})
  await prisma.membership.deleteMany({})
  await prisma.userProfile.deleteMany({})
  await prisma.loginAttempt.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.clubConfig.deleteMany({})

  console.log('✅ Base de datos limpiada')

  // Crear configuración del club
  console.log('⚙️  Creando configuración del club...')
  await prisma.clubConfig.create({
    data: {
      id: 'club_config',
      clubName: 'Club Dreadnought',
      membershipTypes: [
        {
          type: 'SOCIO',
          displayName: 'Socio',
          price: 19,
          hasKey: true,
          description: 'Socio con llave. Requiere 1 año como colaborador + aprobación'
        },
        {
          type: 'COLABORADOR',
          displayName: 'Colaborador',
          price: 15,
          hasKey: false,
          description: 'Colaborador sin llave'
        },
        {
          type: 'FAMILIAR',
          displayName: 'Familiar',
          price: 10,
          hasKey: false,
          description: 'Familiar vinculado a un socio'
        },
        {
          type: 'EN_PRUEBAS',
          displayName: 'En Pruebas',
          price: 0,
          hasKey: false,
          description: 'Periodo de prueba gratuito'
        },
        {
          type: 'BAJA',
          displayName: 'Baja',
          price: 0,
          hasKey: false,
          description: 'Usuario dado de baja'
        }
      ],
      defaultCurrency: 'EUR'
    }
  })
  console.log('✅ Configuración del club creada')

  console.log('📝 Creando usuarios y membresías...')

  let usersCreated = 0
  let membershipsCreated = 0

  for (let i = 0; i < 60; i++) {
    const name = names[i % names.length]
    if (!name) continue // Skip if name is undefined

    // Crear email único agregando un número si es necesario
    const email = i < names.length
      ? `${name.toLowerCase().replace(/ /g, '.')}@ejemplo.com`
      : `${name.toLowerCase().replace(/ /g, '.')}.${i}@ejemplo.com`

    const role = i < 2 ? UserRole.ADMIN : UserRole.USER // Primeros 2 son admin
    const status = i < 50 ? UserStatus.APPROVED : randomFrom([UserStatus.PENDING_VERIFICATION, UserStatus.REJECTED, UserStatus.SUSPENDED])
    const createdAt = randomDate(new Date(2023, 0, 1), new Date())
    const updatedAt = randomDate(createdAt, new Date())
    const lastLoginAt = status === UserStatus.APPROVED ? randomDate(updatedAt, new Date()) : null

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: "$2b$10$gv4dD2bmHFwAyrKQCjtbqOSh.Zpr2OgKANOOl9LDkHAJMdjMtO31a", // password: "password123"
        role,
        status,
        emailVerified: status === UserStatus.APPROVED,
        createdAt,
        updatedAt,
        lastLoginAt
      }
    })
    usersCreated++

    // Solo crear membership para usuarios APPROVED
    if (status === UserStatus.APPROVED) {
      const membershipType = randomFrom([
        MembershipType.COLABORADOR,
        MembershipType.SOCIO,
        MembershipType.FAMILIAR,
        MembershipType.EN_PRUEBAS,
        MembershipType.BAJA
      ])
      const startDate = randomDate(new Date(2023, 0, 1), new Date())

      // Si es BAJA, siempre tiene fechaBaja
      const hasFechaBaja = membershipType === MembershipType.BAJA || Math.random() < 0.05
      const fechaBaja = hasFechaBaja ? randomDate(startDate, new Date()) : null

      await prisma.membership.create({
        data: {
          userId: user.id,
          type: membershipType,
          startDate,
          becameSocioAt: membershipType === MembershipType.SOCIO ? randomDate(startDate, new Date()) : null,
          fechaBaja,
          isActive: !hasFechaBaja,
          lastPaymentDate: hasFechaBaja ? null : randomDate(startDate, new Date()),
          nextPaymentDue: hasFechaBaja ? null : randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
        }
      })
      membershipsCreated++
    }
  }

  console.log(`✅ Seed completado:`)
  console.log(`   👥 ${usersCreated} usuarios creados`)
  console.log(`   💳 ${membershipsCreated} membresías creadas`)
  console.log(`   📊 ~${Math.round(membershipsCreated * 0.1)} usuarios dados de baja`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
