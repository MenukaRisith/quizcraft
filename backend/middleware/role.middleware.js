function restrictToRoles(...allowedRoles) {
    return (req, res, next) => {
      const user = req.user;
  
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ success: false, error: "Access denied." });
      }
  
      next();
    };
  }
  
  module.exports = restrictToRoles;
  