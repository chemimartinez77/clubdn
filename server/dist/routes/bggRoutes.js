"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/bggRoutes.ts
const express_1 = require("express");
const bggController_1 = require("../controllers/bggController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Búsqueda de juegos (requiere autenticación)
router.get('/search', auth_1.authenticate, bggController_1.searchGames);
router.get('/game/:id', auth_1.authenticate, bggController_1.getGame);
exports.default = router;
//# sourceMappingURL=bggRoutes.js.map