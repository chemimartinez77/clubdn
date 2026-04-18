INSERT INTO "BadgeDefinition" ("id", "category", "level", "name", "requiredCount", "description", "iconUrl")
VALUES
  ('cmxinv001001ohos0cc2w9ia', 'INVITADOR', 1, 'Reclutador Novato', 5, NULL, NULL),
  ('cmxinv002001phos01hbmmib', 'INVITADOR', 2, 'Invocador de Jugadores', 10, NULL, NULL),
  ('cmxinv003001qhos02ce8mic', 'INVITADOR', 3, 'Embajador Lúdico', 20, NULL, NULL),
  ('cmxinv004001rhos0s42lmid', 'INVITADOR', 4, 'Anfitrión Incomparable', 40, NULL, NULL),
  ('cmxinv005001shos0ao9jmie', 'INVITADOR', 5, 'Virtuoso de la Acogida', 70, NULL, NULL),
  ('cmxinv006001thos0rvo0mif', 'INVITADOR', 6, 'Leyenda de la Convocatoria', 100, NULL, NULL)
ON CONFLICT ("category", "level") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "requiredCount" = EXCLUDED."requiredCount",
  "description" = EXCLUDED."description",
  "iconUrl" = EXCLUDED."iconUrl";
