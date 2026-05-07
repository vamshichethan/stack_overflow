import jwt from "jsonwebtoken";

const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decodedata = jwt.verify(token, process.env.JWT_SECRET);
    req.userid = decodedata?.id;
  } catch (error) {
    req.userid = null;
  }

  return next();
};

export default optionalAuth;
