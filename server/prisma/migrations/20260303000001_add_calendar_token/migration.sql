-- Añadir calendarToken único por usuario para suscripción a calendario ICS
ALTER TABLE "User" ADD COLUMN "calendarToken" TEXT;
CREATE UNIQUE INDEX "User_calendarToken_key" ON "User"("calendarToken");
