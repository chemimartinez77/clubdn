-- Normalizar importes de movimientos financieros: siempre positivos
-- El tipo de categoría (GASTO/INGRESO) determina la dirección del balance
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'FinancialMovement') THEN
    UPDATE "FinancialMovement" SET amount = ABS(amount) WHERE amount < 0;
  END IF;
END $$;
