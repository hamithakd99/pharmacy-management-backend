import jwt from "jsonwebtoken"

 const generateToken = (
    email: string,
    firstName: string,
    lastName: string,
    role: string,
    userId: string

) => {
    const token = jwt.sign(
        {
            email,
            firstName,
            lastName,
            role,
            userId
        },
        process.env.JWT_SECRET!,

    );
    return token;
};

export default generateToken;