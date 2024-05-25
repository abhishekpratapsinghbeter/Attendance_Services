const jwt = require('jsonwebtoken');


function authMiddleware(allowedRoles) {
    return function(req, res, next) {
        let token;
        if (req.cookies.token) {
            token = req.cookies.token;
        } else {
             token = req.header('Authorization');
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

            try {
                jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                  if (err) {
                    console.error('Error verifying token:', err);
                    return res.status(401).json({ error: 'Invalid token' });
                  }
          
                  const userID = decoded.userID;
                  const userRole = decoded.role;
                  if (!allowedRoles.includes(userRole)) {
                    return res.status(403).json({ error: 'Forbidden' });
                  }
          
                  req.userID= userID
                  req.userRole = userRole;
                  req.Token = token
                  next();
                });
              } catch (error) {
                console.error('Error in authMiddleware:', error);
                return res.status(401).json({ error: 'Unauthorized' });
              }
    };
}

module.exports = authMiddleware;
