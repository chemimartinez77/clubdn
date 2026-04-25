-- Seed de los 12 badges nuevos: PRIMER_JUGADOR (6 niveles) y GIRADOR_RULETA (6 niveles)

INSERT INTO "BadgeDefinition" (id, category, level, name, description, "iconUrl", "requiredCount", "createdAt") VALUES
-- PRIMER_JUGADOR: veces que el usuario ha sido elegido como primer jugador
('cmfp001001ahos0cc2w9ia', 'PRIMER_JUGADOR', 1, 'Novato con Suerte',          NULL, NULL, 5,   '2026-04-25 00:00:00.000'),
('cmfp002001bhos01hbmmib', 'PRIMER_JUGADOR', 2, 'Favorito del Azar',           NULL, NULL, 10,  '2026-04-25 00:00:00.000'),
('cmfp003001chos02ce8mic', 'PRIMER_JUGADOR', 3, 'El Primero de Siempre',       NULL, NULL, 20,  '2026-04-25 00:00:00.000'),
('cmfp004001dhos0s42lmid', 'PRIMER_JUGADOR', 4, 'Maestro del Comienzo',        NULL, NULL, 40,  '2026-04-25 00:00:00.000'),
('cmfp005001ehos0ao9jmie', 'PRIMER_JUGADOR', 5, 'El Elegido',                  NULL, NULL, 70,  '2026-04-25 00:00:00.000'),
('cmfp006001fhos0rvo0mif', 'PRIMER_JUGADOR', 6, 'Leyenda del Primer Turno',    NULL, NULL, 100, '2026-04-25 00:00:00.000'),
-- GIRADOR_RULETA: veces que el usuario ha girado la ruleta de primer jugador
('cmgr001001ahos0cc2w9ia', 'GIRADOR_RULETA', 1, 'Aprendiz del Destino',        NULL, NULL, 5,   '2026-04-25 00:00:00.000'),
('cmgr002001bhos01hbmmib', 'GIRADOR_RULETA', 2, 'Agitador de Fortunas',        NULL, NULL, 10,  '2026-04-25 00:00:00.000'),
('cmgr003001chos02ce8mic', 'GIRADOR_RULETA', 3, 'Conjurador del Azar',         NULL, NULL, 20,  '2026-04-25 00:00:00.000'),
('cmgr004001dhos0s42lmid', 'GIRADOR_RULETA', 4, 'Maestro de Ceremonias',       NULL, NULL, 40,  '2026-04-25 00:00:00.000'),
('cmgr005001ehos0ao9jmie', 'GIRADOR_RULETA', 5, 'El Gran Oraculo',             NULL, NULL, 70,  '2026-04-25 00:00:00.000'),
('cmgr006001fhos0rvo0mif', 'GIRADOR_RULETA', 6, 'Arbitro Supremo del Inicio',  NULL, NULL, 100, '2026-04-25 00:00:00.000');
