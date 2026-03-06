import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  let token = null;

  // 1️⃣ Check User Cookie
  if (req.cookies?.userToken) {
    token = req.cookies.userToken;
  }

  // 2️⃣ Check Admin Cookie
  if (!token && req.cookies?.adminToken) {
    token = req.cookies.adminToken;
  }

  // 3️⃣ Check Authorization Header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;

    if (authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }
  }

  // 4️⃣ If no token
  if (!token) {

  console.log("❌ Token not found in request headers");
  console.log("Request Headers:", req.headers);

  return res.status(401).json({
    success: false,
    message: "No token provided",
  });
}

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
   
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};




export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access Denied. Admin only.",
    });
  }
  next();
};    