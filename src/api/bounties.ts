import { app } from "..";

import { type Request, type Response } from "express";
import { StartBountyPOSTData } from "../sharedTypes";
import prisma from "../prisma";

export function bountiesSetup() {
  app.get("/get-bounties", async (req: Request, res: Response) => {
    const data = await prisma.bounty.findMany({
      include: {
        project: true,
      },
    });
    return res.send(data);
  });
  app.get("/get-bounty-by-id/:id", async (req: Request, res: Response) => {
    if (!req.params.id) return res.status(400).json({ message: "No ID" });
    console.log("here");
    const bounty = await prisma.bounty.findUnique({
      where: {
        id: req.params.id as string,
      },
      include: {
        project: true,
        founder: true,
      },
    });
    console.log(bounty);
    return res.send(bounty);
  });
  app.post("/start-bounty", async (req: Request, res: Response) => {
    const { address, forTeam, bountyID } = req.body as StartBountyPOSTData;

    if (!address) return res.sendStatus(400).json({ message: "No address" });
    if (!forTeam) return res.sendStatus(400).json({ message: "No team" });
    if (!bountyID) return res.sendStatus(400).json({ message: "No bounty" });

    const team = await prisma.team.findUnique({
      where: {
        id: forTeam,
      },
    });
    if (address != team.creatorAddress)
      return res
        .sendStatus(400)
        .json({ message: "You are not the team owner." });

    const bounty = await prisma.bounty.update({
      where: {
        id: bountyID,
      },
      data: {
        participantsTeamIDs: {
          push: team.id,
        },
      },
    });

    console.log(`success started bounty for team ${team.name}`);
    res.sendStatus(200);
  });
}
