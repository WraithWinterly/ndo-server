import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
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

export interface Field {
  name: string;
  type?: "string" | "number" | "boolean" | "array" | "any";
  min?: number;
  max?: number;
}

export function validateFields<T>(
  fields: Field[],
  requestBody: any,
  res: Response
): T {
  const sanitizedBody: any = {};
  const invalidFields: string[] = [];

  for (const field of fields) {
    const fieldValue = requestBody[field.name];

    if (fieldValue === undefined || fieldValue === null) {
      invalidFields.push(field.name);
    } else {
      let sanitizedValue;

      if (field.type === "string") {
        if (typeof fieldValue !== "string") {
          invalidFields.push(`${field.name} must be a string.`);
          continue;
        }
        sanitizedValue = fieldValue.trim();
        if (field.max !== undefined) {
          sanitizedValue = sanitizedValue.slice(0, field.max);
        }
      } else if (field.type === "number") {
        if (typeof fieldValue !== "number") {
          invalidFields.push(`${field.name} must be a number.`);
          continue;
        }
        sanitizedValue = fieldValue;
      } else if (field.type === "boolean") {
        if (typeof fieldValue !== "boolean") {
          invalidFields.push(`${field.name} must be a boolean.`);
          continue;
        }
        sanitizedValue = fieldValue;
      } else if (field.type === "any") {
        if (!Array.isArray(fieldValue)) {
          invalidFields.push(`${field.name} must be an array.`);
          continue;
        }
      } else {
        // field.type === 'any'
        sanitizedValue = fieldValue;
      }

      if (
        field.type !== "any" &&
        field.min !== undefined &&
        typeof sanitizedValue === "string" &&
        sanitizedValue.length < field.min
      ) {
        invalidFields.push(`${field.name} is too short.`);
        continue;
      }

      sanitizedBody[field.name] = sanitizedValue;
    }
  }

  if (invalidFields.length > 0) {
    let errorMessage = `Invalid fields: ${invalidFields.join(", ")}. `;
    res.status(400).json({ message: errorMessage });
    return;
  }

  return sanitizedBody as T;
}
