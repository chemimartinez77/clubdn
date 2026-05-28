import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const plainPassword = process.argv[3];

    if (!email || !plainPassword) {
        throw new Error('Uso: npx tsx src/fix-password.ts <email> <nueva_contraseña>');
    }

    // Generamos el hash con la misma librería que usa la autenticación principal.
    const saltRounds = 10;
    const newHash = await bcrypt.hash(plainPassword, saltRounds);

    console.log(`Hash generado para ${email}: ${newHash}`);

    const updatedUser = await prisma.user.update({
        where: { email },
        data: { password: newHash },
    });

    console.log(`Contraseña actualizada correctamente para: ${updatedUser.email}`);
}

main()
    .catch((e) => console.error('Error:', e))
    .finally(async () => await prisma.$disconnect());
