import jwt from "jsonwebtoken";
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    let decodedata = jwt.verify(token, process.env.JWT_SECRET);
    req.userid = decodedata?.id;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Unauthorized access" });
  }
};
export default auth
