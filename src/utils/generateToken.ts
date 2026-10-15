import jwt from "jsonwebtoken";

const generateToken = (
  email: string,
  firstName: string,
  lastName: string,
  role: string,
  userId: string
): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      email,
      firstName,
      lastName,
      role,
      userId,
    },
    secret,
    {
      expiresIn: "15m",
      algorithm: "HS256",
    }
  );
};

export default generateToken;
