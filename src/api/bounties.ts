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
    // Called when a user clicks 'view details' on a bounty. req.params.id is the Bounty ID.

    // If it is not provided, return 400.
    if (!req.params.id) return res.status(400).json({ message: "No ID" });

    // Find the bounty from the database
    const bounty = await prisma.bounty.findUnique({
      where: {
        id: req.params.id as string,
      },
      include: {
        // We need to include the project to show "Project X" on the bounty page or list.
        project: true,
        // We include the founder for the "Meet the Founder" portion on the view bounty page.
        founder: true,
      },
    });

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
    res.json({
      message: "Success",
    });
  });
}
