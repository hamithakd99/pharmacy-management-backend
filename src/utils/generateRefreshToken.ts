import jwt from "jsonwebtoken";

const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return jwt.sign(
    { userId, tokenType: "refresh" },
    secret,
    {
      expiresIn: "7d",
      algorithm: "HS256",
    }
  );
};

export default generateRefreshToken;