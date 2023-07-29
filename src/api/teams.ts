import { create } from "domain";
import { app, db } from "..";
import { CreateTeam, type Team } from "../sharedTypes";
import { type Request, type Response } from "express";
import { v4 as uuid } from "uuid";

export const SAMPLE_TEAMS: Team[] = [
  {
    id: "3D1DADE6-1493-41CB-84DC-5F53F4860959",
    name: "Team Solsitce",
    description: "lorem20",
    creatorAddress: "FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd",
    members: ["FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd"],
    link: "https://aydens.net",
  },
  {
    id: "B985E4B9-2642-41E3-864F-776DC03BA8DE",
    name: "Team Compete!!!",
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
  app.post("/create-team", async (req: Request, res: Response) => {
    const data = req.body as CreateTeam;
    console.log(data);
    try {
      const currTeams = (await db.getObjectDefault("/teams", undefined)) as
        | Team[]
        | undefined;
      if (data.name.trim().length < 3) return res.sendStatus(400);

      if (data.description.trim().length < 3) return res.sendStatus(400);
      if (data.link.trim().length < 3) return res.sendStatus(400);

      const linkRegex = /^(ftp|http|https):\/\/[^ "]+$/;
      if (!linkRegex.test(data.link)) return res.sendStatus(400);

      if (!data.creatorAddress) return res.sendStatus(400);
      console.log("ere");

      // Send invites using these addresses
      // data.memberAddressesToInvite
      const completeData: Team = {
        ...data,
        members: [data.creatorAddress],
        id: uuid(),
      };
      db.push("/teams", [completeData, ...currTeams]);
      // console.log(currTeams);

      console.log(completeData);

      res.sendStatus(200);
    } catch (e) {
      console.log(e);
      res.sendStatus(400);
    }
  });
}
