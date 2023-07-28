import { SAMPLE_MEMBERS } from "./members";
import { Notification } from "../sharedTypes";
import { db } from "../";
import { app } from "../";
import { Request, Response } from "express";

const SAMPLE_NOTIFICATIONS: Array<Notification> = [
  {
    id: "0",
    user: SAMPLE_MEMBERS[0],
    team: undefined,
    type: "BountyWon",
  },
  {
    id: "1",
    user: SAMPLE_MEMBERS[0],
    team: undefined,
    type: "InvitedJoinTeam",
  },
  {
    id: "2",
    user: SAMPLE_MEMBERS[1],
    team: undefined,
    type: "RequestJoinTeam",
  },
];

export async function inboxSeed() {
  await db.push("/inbox", SAMPLE_NOTIFICATIONS, true);
}

export function inboxSetup() {
  app.get("/get-inbox", async (req: Request, res: Response) => {
    const notis = (await db.getObjectDefault("/inbox", undefined)) as
      | Notification[]
      | undefined;
    // console.log(notis);
    res.send(notis);
  });
}
