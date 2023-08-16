import { app } from "..";
import {
  CreateTeamPOSTData,
  InviteToTeamPOSTData,
  JoinTeamPOSTData,
} from "../sharedTypes";
import { type Request, type Response } from "express";
import { InviteToTeam } from "./members";
import prisma from "../prisma";
import {
  ProtectedRequest,
  authenticateMember,
  authenticateToken,
} from "../utils";

export function teamsSetup() {
  app.get(
    "/get-teams",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const teams = await prisma.team.findMany({
        include: {
          members: {
            select: {
              walletAddress: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      // console.log(currTeams);
      res.send(teams);
    }
  );
  app.get(
    "/get-team-by-id/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id) {
        return res.status(400).json({ message: "No ID" });
      }

      const team = await prisma.team.findUnique({
        where: {
          id: req.params.id,
        },
        include: {
          members: true,
        },
      });

      if (!team) {
        return res.send(404).json({ message: "Team not found" });
      }

      return res.send(team);
    }
  );
  app.post(
    "/create-team",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const data = req.body as CreateTeamPOSTData;

      try {
        if (!data.name || data.name.trim().length < 3)
          return res.send(400).json({
            message: "Name must be present and at least 3 characters long",
          });

        if (data.description.trim().length < 3)
          return res.send(400).json({
            message:
              "Description must be present and at least 3 characters long",
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
            members: {
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
        res.json({
          message: "Success",
        });
      } catch (e) {
        console.log(e);
        res.send(400).json(e);
      }
    }
  );
  app.post(
    "/invite-to-team",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const data = req.body as InviteToTeamPOSTData;
      const member = await authenticateMember(req, res);
      if (!data)
        return res.send(400).json({
          message: "No data provided",
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
            walletAddress: member.walletAddress,
          },
        });
        const team = await prisma.team.findUnique({
          where: {
            id: data.toTeam,
          },
        });

        const error = await InviteToTeam({
          fromAddress: member.walletAddress,
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

        res.json({
          message: "Success",
        });
      } catch (e) {
        console.error(e);
        return res.sendStatus(400);
      }
    }
  );
  app.post(
    "/join-team-from-invite",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      teamInvite(req, res, "accept");
    }
  );
  app.post(
    "/deny-team-from-invite",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      teamInvite(req, res, "reject");
    }
  );
  app.get(
    "/get-team-pending-invites/:id",
    async (req: ProtectedRequest, res: Response) => {
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
  req: ProtectedRequest,
  res: Response,
  type: "accept" | "reject"
) {
  const data = req.body as JoinTeamPOSTData;
  const authMember = await authenticateMember(req, res);
  // Ensure correct body data
  if (!data) return res.status(400).json({ message: "No data provided" });

  if (!data.toTeamID)
    return res.status(400).json({ message: "No toTeamID provided" });

  const member = await prisma.member.findUnique({
    where: {
      walletAddress: authMember.walletAddress,
    },
    include: {
      teams: true,
    },
  });
  if (!member) return res.status(400).json({ message: "User not found" });
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
        fromAddress: authMember.walletAddress,
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
            connect: { walletAddress: authMember.walletAddress },
          },
        },
      });
      // Update teamsJoined stat
      await prisma.member.update({
        where: {
          walletAddress: authMember.walletAddress,
        },
        data: {
          teamsJoined: Number(member.teams.length),
        },
      });
    }
    console.log("Success");
    res.json({
      message: "Success",
    });
  } catch (e) {
    console.error(e);
    return res.sendStatus(400);
  }
}
