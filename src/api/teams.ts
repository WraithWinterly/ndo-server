import { app } from "..";
import {
  CreateTeamPOSTData,
  InviteToTeamPOSTData,
  JoinTeamPOSTData,
} from "../sharedTypes";
import { type Request, type Response } from "express";
import { InviteToTeam } from "./members";
import prisma from "../prisma";

export function teamsSetup() {
  app.get("/get-teams", async (req: Request, res: Response) => {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          select: {
            walletAddress: true,
          },
        },
      },
    });
    // console.log(currTeams);
    res.send(teams);
  });
  app.get("/get-team-by-id/:id", async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res.status(400).json({ message: "No ID" });
    }

    const team = await prisma.team.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!team) return res.send(404).json({ message: "Team not found" });

    res.send(team);
  });
  app.post("/create-team", async (req: Request, res: Response) => {
    const data = req.body as CreateTeamPOSTData;

    try {
      if (!data.name || data.name.trim().length < 3)
        return res.send(400).json({
          message: "Name must be present and at least 3 characters long",
        });

      if (data.description.trim().length < 3)
        return res.send(400).json({
          message: "Description must be present and at least 3 characters long",
        });
      if (data.link.trim().length < 3)
        return res.send(400).json({
          message: "Link must be present and at least 3 characters long",
        });

      const linkRegex = /^(ftp|http|https):\/\/[^ "]+$/;

      if (!linkRegex.test(data.link))
        return res.send(400).json({
          message: "Invalid link sent to server",
        });

      if (!data.creatorAddress)
        return res.send(400).json({
          message: "No creator address provided",
        });

      const user = await prisma.member.findUnique({
        where: {
          walletAddress: data.creatorAddress,
        },
      });

      const createdTeam = await prisma.team.create({
        data: {
          name: data.name,
          description: data.description,
          link: data.link,
          creator: {
            connect: {
              walletAddress: data.creatorAddress,
            },
          },
        },
      });

      // Send notification to the users
      data.memberAddressesToInvite.forEach((address) => {
        try {
          InviteToTeam({
            fromAddress: data.creatorAddress,
            fromAddressName: user.firstName,
            teamID: createdTeam.id,
            teamName: createdTeam.name,
            userAddress: address,
          });
        } catch (e) {
          console.error(e);
          return res.sendStatus(400).json({
            message: "Failed to send invites to members",
          });
        }
      });
      res.sendStatus(200);
    } catch (e) {
      console.log(e);
      res.send(400).json(e);
    }
  });
  app.post("/invite-to-team", async (req: Request, res: Response) => {
    const data = req.body as InviteToTeamPOSTData;
    console.log(data);
    if (!data)
      return res.send(400).json({
        message: "No data provided",
      });
    if (!data.fromAddress)
      return res.send(400).json({
        message: "No from address provided",
      });

    if (!data.toAddress)
      return res.send(400).json({
        message: "No to address provided",
      });
    if (!data.toTeam)
      return res.send(400).json({
        message: "No to team provided",
      });

    try {
      const fromUser = await prisma.member.findUnique({
        where: {
          walletAddress: data.fromAddress,
        },
      });
      const team = await prisma.team.findUnique({
        where: {
          id: data.toTeam,
        },
      });

      const error = await InviteToTeam({
        fromAddress: data.fromAddress,
        fromAddressName: fromUser.firstName,
        teamID: data.toTeam,
        teamName: team.name,
        userAddress: data.toAddress,
      });
      if (error?.length > 0) {
        console.error(error);
        // throw error;
        // return res.send(400).json({
        //   message: "Failed to invite member to team",
        // });
      }

      res.sendStatus(200);
    } catch (e) {
      console.error(e);
      return res.sendStatus(400);
    }
  });
  app.post("/join-team-from-invite", async (req: Request, res: Response) => {
    teamInvite(req, res, "accept");
  });
  app.post("/deny-team-from-invite", async (req: Request, res: Response) => {
    teamInvite(req, res, "reject");
  });
  app.get(
    "/get-team-pending-invites/:id",
    async (req: Request, res: Response) => {
      console.log("test");
      if (!req.params.id)
        return res.send(400).json({
          message: "No team ID provided",
        });
      const invites = await prisma.teamInvite.findMany({
        where: {
          toTeamId: req.params.id,
        },
      });
      res.send(invites);
    }
  );
}

async function teamInvite(
  req: Request,
  res: Response,
  type: "accept" | "reject"
) {
  const data = req.body as JoinTeamPOSTData;
  // Ensure correct body data
  if (!data) return res.sendStatus(400);
  if (!data.fromAddress) return res.sendStatus(400);
  if (!data.toTeamID) return res.sendStatus(400);

  try {
    const team = await prisma.team.findUnique({
      where: {
        id: data.toTeamID,
      },
      include: {
        members: true,
      },
    });
    // Remove their pending invite
    await prisma.teamInvite.deleteMany({
      where: {
        fromAddress: data.fromAddress,
        AND: {
          toTeamId: data.toTeamID,
        },
      },
    });

    // If they accept, add them to the team
    if (type === "accept") {
      // Add to team

      await prisma.team.update({
        where: {
          id: team.id,
        },
        data: {
          members: {
            connect: { walletAddress: data.fromAddress },
          },
        },
      });
    }
    console.log("Success");
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    return res.sendStatus(400);
  }
}
