import { app, db } from "..";
import { type Team } from "../sharedTypes";
import { type Request, type Response } from "express";

export const SAMPLE_TEAMS: Team[] = [
  {
    id: "3D1DADE6-1493-41CB-84DC-5F53F4860959",
    title: "Team Solsitce",
    description: "lorem20",
    creatorAddress: "FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd",
    members: ["FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd"],
    link: "https://aydens.net",
  },
  {
    id: "B985E4B9-2642-41E3-864F-776DC03BA8DE",
    title: "Team Compete!!!",
    description: "lorem20",
    creatorAddress: "",
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
