import { app, db } from "..";
import {
  CreateTeam,
  InviteToTeamPOSTData,
  JoinTeamPOSTData,
  Member,
  type Team,
} from "../sharedTypes";
import { type Request, type Response } from "express";
import { v4 as uuid } from "uuid";
import { InviteToTeam } from "./members";

export const SAMPLE_TEAMS: Team[] = [
  {
    id: "3D1DADE6-1493-41CB-84DC-5F53F4860959",
    name: "Team Solsitce",
    description: "lorem20",
    creatorAddress: "FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd",
    link: "https://aydens.net",
    pendingInvites: [],
    members: ["FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd"],
  },
  {
    id: "B985E4B9-2642-41E3-864F-776DC03BA8DE",
    name: "Team Compete!!!",
    description: "lorem20",
    creatorAddress: "",
    link: "https://aydens.net",
    pendingInvites: [],
    members: [],
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
  app.get("/get-team-by-id/:id", async (req: Request, res: Response) => {
    const currTeams = (await db.getData("/teams")) as Team[] | undefined;
    const team = currTeams?.find((team) => team.id == req.params.id);
    console.log(currTeams);
    console.log(req.params.id);
    if (!team) return res.sendStatus(404);
    res.send(team);
  });
  app.post("/create-team", async (req: Request, res: Response) => {
    const data = req.body as CreateTeam;
    console.log(data);
    try {
      const currTeams = (await db.getData("/teams")) as Team[] | undefined;
      if (data.name.trim().length < 3) return res.sendStatus(400);

      if (data.description.trim().length < 3) return res.sendStatus(400);
      if (data.link.trim().length < 3) return res.sendStatus(400);

      const linkRegex = /^(ftp|http|https):\/\/[^ "]+$/;
      if (!linkRegex.test(data.link)) return res.sendStatus(400);

      if (!data.creatorAddress) return res.sendStatus(400);
      console.log("ere");

      const users = (await db.getObjectDefault(
        "/users",
        undefined
      )) as Member[];
      if (!users) return res.sendStatus(400);
      const user = users.find(
        (user) => user.walletAddress == data.creatorAddress
      );
      if (!user) return res.sendStatus(400);

      const completeData: Team = {
        ...data,
        members: [data.creatorAddress],
        pendingInvites: data.memberAddressesToInvite,
        id: uuid(),
      };
      // Send notification to the users
      data.memberAddressesToInvite.forEach((address) => {
        try {
          InviteToTeam({
            fromAddress: data.creatorAddress,
            fromAddressName: user.firstName,
            teamID: completeData.id,
            teamName: completeData.name,
            userAddress: address,
          });
        } catch (e) {
          console.error(e);
        }
      });

      db.push("/teams", [completeData, ...currTeams]);
      // console.log(currTeams);

      console.log(completeData);

      res.sendStatus(200);
    } catch (e) {
      console.log(e);
      res.sendStatus(400);
    }
  });
  app.post("/invite-to-team", async (req: Request, res: Response) => {
    const data = req.body as InviteToTeamPOSTData;

    if (!data) return res.sendStatus(400);
    if (!data.fromAddress) return res.sendStatus(400);

    if (!data.toAddress) return res.sendStatus(400);
    if (!data.toTeam) return res.sendStatus(400);

    try {
      const currTeams = (await db.getData("/teams")) as Team[] | undefined;

      if (!currTeams) return res.sendStatus(400);
      const team = currTeams.find((team) => team.id == data.toTeam);
      if (!team) return res.sendStatus(400);

      // console.log("here");
      const users = (await db.getData("/members")) as Member[];
      if (!users) return res.sendStatus(400);
      const fromUser = users.find(
        (user) => user.walletAddress == data.toAddress
      );

      if (!fromUser) return res.sendStatus(400);
      try {
        const error = await InviteToTeam({
          fromAddress: data.fromAddress,
          fromAddressName: fromUser.firstName,
          teamID: data.toTeam,
          teamName: team.name,
          userAddress: data.toAddress,
        });
        if (error?.length > 0) {
          return res.sendStatus(400);
        }
      } catch (e) {
        console.error(e);
        return res.sendStatus(400);
      }

      db.push("/teams", currTeams);
      res.sendStatus(200);
    } catch (e) {
      console.error(e);
      return res.sendStatus(400);
    }
  });
  app.post("/join-team-from-invite", async (req: Request, res: Response) => {
    const data = req.body as JoinTeamPOSTData;
    // Ensure correct body data
    if (!data) return res.sendStatus(400);
    if (!data.fromAddress) return res.sendStatus(400);
    if (!data.toTeamID) return res.sendStatus(400);

    try {
      // Find target team and member
      const teams = (await db.getData("/teams")) as Team[] | undefined;

      if (!teams) return res.sendStatus(400);

      const team = teams.find((team) => team.id == data.toTeamID);

      if (!team) return res.sendStatus(400);

      const members = (await db.getData("/members")) as Member[];
      if (!members) return res.sendStatus(400);

      const fromUser = members.find(
        (user) => user.walletAddress == data.fromAddress
      );

      if (!fromUser) return res.sendStatus(400);

      // Remove their pending invite
      fromUser.pendingTeamInvites = fromUser.pendingTeamInvites.filter(
        (invite) => invite.toTeamId != data.toTeamID
      );
      team.pendingInvites = team.pendingInvites.filter(
        (invite) => invite != data.fromAddress
      );
      // Add to team
      if (!team.members.includes(data.fromAddress)) {
        team.members.push(data.fromAddress);
      }

      // Update DB
      db.push("/teams", teams);
      db.push("/members", members);
      console.log("success");
      res.sendStatus(200);
    } catch (e) {
      console.error(e);
      return res.sendStatus(400);
    }
  });
}
