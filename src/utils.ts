import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { users } from "./";
import { Member } from "../prisma/generated";
import prisma from "./prisma";

export interface ProtectedRequest extends Request {
  walletAddress: string;
}

export function generateAccessToken(walletAddress: string) {
  return jwt.sign({ id: walletAddress }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
}

export function authenticateToken(
  req: ProtectedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.headers || !req.headers.authorization) {
    return res.status(401).json({ message: "No authorization header" });
  }
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  if (token == null)
    return res.status(401).json({
      message: "No token provided",
    });

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, walletAddress) => {
    if (err) {
      console.error(err);
      return res.status(403).json({ message: `Invalid token: ${err}` });
    }
    if (!(walletAddress as any).id) {
      return res.status(401).json({ message: "Wallet address is not found" });
    }

    req.walletAddress = (walletAddress as any).id as string;
    next();
  });
}

export async function authenticateMember(
  req: ProtectedRequest,
  res: Response
): Promise<Member> {
  if (!req.walletAddress) {
    res.status(401).json({ message: "Not authenticated." });
    return;
  }
  //   const doc = await users.doc(req.walletAddress).get();
  //   if (!doc.exists) {
  //     res.status(401).json({ message: "User not found" });
  //     return;
  //   }
  //   return doc.data() as Member;
  const member = await prisma.member.findUnique({
    where: {
      walletAddress: req.walletAddress,
    },
  });
  if (!member) {
    res.status(401).json({ message: "User not found" });
    return;
  }
  return member;
}
