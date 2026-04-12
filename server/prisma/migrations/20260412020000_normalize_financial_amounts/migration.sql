-- Normalizar importes de movimientos financieros: siempre positivos
-- El tipo de categoría (GASTO/INGRESO) determina la dirección del balance
UPDATE "FinancialMovement"
SET amount = ABS(amount)
WHERE amount < 0;
