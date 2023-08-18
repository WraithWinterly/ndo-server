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
  if (!doc.exists) {
    res.status(401).json({ message: "User not found" });
    return;
  }
  return doc as Member;
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

export async function includeMany(options: {
  data: Object[];
  propertyName: string;
  idPropertyName: string;
  dbCollection: Collections;
}): Promise<Object[]> {
  const { data, propertyName, idPropertyName, dbCollection } = options;
  const ids = new Set<string>();

  data.forEach((item: any) => {
    if (item[idPropertyName]) {
      ids.add(item[idPropertyName]);
    }
  });

  const resultMap: Record<string, any> = {};

  const batch = db.batch();

  const idArray = Array.from(ids);
  const batchSize = 10; // Adjust the batch size as needed

  for (let i = 0; i < idArray.length; i += batchSize) {
    const batchIds = idArray.slice(i, i + batchSize);

    const batchSnapshots = await Promise.all(
      batchIds.map((id) => db.collection(dbCollection).doc(id).get())
    );

    batchSnapshots.forEach((snapshot) => {
      resultMap[snapshot.id] = snapshot.data();
    });
  }

  // data.forEach((item: any) => {
  //   if (item[idPropertyName]) {
  //     item[propertyName] = resultMap[item[idPropertyName]];

  //     const docRef = db.collection(dbCollection).doc(item[idPropertyName]);
  //     batch.update(docRef, { [propertyName]: resultMap[item[idPropertyName]] });
  //   }
  // });

  // Commit the batch writes
  await batch.commit();

  return data;
}

export async function includeSingle<T>(options: {
  data: Object;
  propertyName: string;
  idPropertyName: string;
  dbCollection: Collections;
}): Promise<Object> {
  const { data, propertyName, idPropertyName, dbCollection } = options;

  //@ts-ignore
  const id = data[idPropertyName];

  if (!id) {
    throw new Error(
      `The provided object does not have an ID (${idPropertyName}).`
    );
  }

  const snapshot = await db.collection(dbCollection).doc(id).get();
  const result = snapshot.data();

  if (!result) {
    //@ts-ignore
    data[propertyName] = undefined;
  } else {
    //@ts-ignore
    data[propertyName] = result;
  }

  return data;
}

// Usage example:
// const dataWithProjects = await includeMany(
//   data,
//   "project",
//   "projectID",
//   dbProjects
// );
