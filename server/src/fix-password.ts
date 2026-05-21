import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // o la librería que uses (bcryptjs, etc.)

const prisma = new PrismaClient();

async function main() {
    // Generamos el hash asegurándonos de que use la misma librería que tu authController
    const saltRounds = 10;
    const newHash = await bcrypt.hash('Admin123', saltRounds);

    console.log(`🔑 Generado nuevo hash: ${newHash}`);

    // Actualizamos el usuario directamente en tu Postgres de Docker
    const updatedUser = await prisma.user.update({
        where: { email: 'chemimartinez@gmail.com' },
        data: { password: newHash },
    });

    console.log(`✅ Contraseña actualizada correctamente para: ${updatedUser.email}`);
}

main()
    .catch((e) => console.error('❌ Error:', e))
    .finally(async () => await prisma.$disconnect());