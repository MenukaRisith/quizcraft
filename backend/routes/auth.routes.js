const express = require("express");
const router = express.Router();
const { login, registerCoordinator } = require("../controllers/auth.controller");
const requireAuth = require("../middleware/auth.middleware");
const restrictToRoles = require("../middleware/role.middleware");

router.post("/login", login);
router.post(
    "/register",
    requireAuth,
    restrictToRoles("admin"),
    registerCoordinator
  );

module.exports = router;
