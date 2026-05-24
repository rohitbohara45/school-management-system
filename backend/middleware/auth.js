const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    // 1. Get token from Authorization header
    // Header format: "Bearer eyJhbGci..."
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach admin info to request object for controllers to use
    req.admin = decoded;

    // 4. Pass control to the next middleware/controller
    next();

  } catch (error) {
    // jwt.verify throws if token is invalid or expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

module.exports = { protect };