import { app, db } from "..";
import { type Team } from "../sharedTypes";
import { type Request, type Response } from "express";

export const SAMPLE_TEAMS: Team[] = [
  {
    id: "1",
    title: "Team Solsitce",
    description: "lorem20",
    memberCount: 2,
    creatorID: "",
    members: [],
    link: "https://aydens.net",
  },
  {
    id: "2",
    title: "Team Compete!!!",
    description: "lorem20",
    memberCount: 4,
    creatorID: "",
    members: [],
    link: "https://aydens.net",
  },
];

export async function teamsSeed() {
  await db.push("/teams", SAMPLE_TEAMS, true);
}

export function teamsSetup() {
  app.get("/get-teams", async (req: Request, res: Response) => {
    const currTeams = (await db.getObjectDefault("/teams", undefined)) as
      | Team[]
      | undefined;
    // console.log(currTeams);
    res.send(currTeams);
  });
}
