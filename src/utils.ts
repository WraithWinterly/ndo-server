import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Collections, db, dbMembers } from "./";
import { Member } from "./sharedTypes";

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
  const doc = (await dbMembers.doc(req.walletAddress).get()).data();
  if (!doc) {
    res.status(401).json({ message: "User not found" });
    return;
  }
  return doc as Member;
}

export interface Field {
  name: string;
  type?: "string" | "number" | "boolean" | "array" | "nocheck";
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
      } else if (field.type === "array") {
        if (!Array.isArray(fieldValue)) {
          invalidFields.push(`${field.name} must be an array.`);
          continue;
        }
        sanitizedValue = fieldValue;
      } else {
        // field.type === 'nocheck'
        sanitizedValue = fieldValue;
      }

      if (
        field.type !== "nocheck" &&
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

export async function include(options: {
  data: Object | Object[];
  propertyName: string;
  propertyNameID: string;
  dbCollection: Collections;
  select?: string[];
}): Promise<Object | Object[]> {
  const { data, propertyName, propertyNameID, dbCollection, select } = options;
  const isArray = Array.isArray(data);
  const dataAny = structuredClone(data) as any;

  async function fetchDocument(id: string): Promise<Object | undefined> {
    const snapshot = await db.collection(dbCollection).doc(id).get();
    let result = snapshot.data();
    if (!result) {
      console.warn(
        `Document ${id} not found, but is in the ID array. ${propertyNameID} @ ${dbCollection}`
      );
      return undefined;
    }

    if (!!select) {
      const temp = result;
      result = {};

      for (const s of select) {
        if (temp[s]) result[s] = temp[s];
      }
    }
    return result;
  }

  async function processItem(item: any) {
    const ids = isArray ? item[propertyNameID] : dataAny[propertyNameID];

    // Do not use !ids, an empty string would return as undefined
    if (ids == null) {
      console.warn(
        `The provided object does not have an ID (${propertyNameID}).`
      );
      return item;
    }

    if (typeof ids === "string") {
      if (ids === "") {
        item[propertyName] = undefined;
      } else {
        const result = await fetchDocument(ids);
        item[propertyName] = result || undefined;
      }
    } else if (Array.isArray(ids)) {
      const results: Object[] = await Promise.all(ids.map(fetchDocument));
      item[propertyName] = results.filter((result) => !!result);
    }
  }

  if (isArray) {
    await Promise.all(dataAny.map(processItem));
  } else if (typeof data === "object") {
    await processItem(dataAny);
  }

  return dataAny;
}
