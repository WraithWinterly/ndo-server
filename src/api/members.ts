import { Member, RoleType, Team } from "../../prisma/generated";
import { app } from "../";

import { Request, Response } from "express";

import prisma from "../prisma";
import {
  ChangeRolePOSTData,
  ConfirmRewardPostData,
  CreateProfilePOSTData,
  UpdateRolesPostData,
} from "../sharedTypes";

export function membersSetup() {
  app.get(
    "/get-member-by-wallet-address/:id",
    async (req: Request, res: Response) => {
      if (!req.params.id) {
        return res.status(400).json({
          message: "No ID provided",
        });
      }
      const member = await prisma.member.findUnique({
        where: {
          walletAddress: req.params.id,
        },
      });
      if (!member) {
        res.status(404).json({
          message: "Member not found",
        });
        return;
      }
      res.send(member);
    }
  );
  app.get("/get-my-profile/:id", async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res.status(400).json({
        message: "No ID provided",
      });
    }
    const member = await prisma.member.findUnique({
      where: {
        walletAddress: req.params.id,
      },
      include: {
        teamInvites: true,
      },
    });
    if (!member) {
      res.status(404).json({
        message: "Member not found",
      });
      return;
    }
    res.send(member);
  });
  app.post(
    "/get-members-by-wallet-addresses",
    async (req: Request, res: Response) => {
      // console.log("a: ");
      const addresses = req.body as string[];

      if (!addresses) {
        res.status(400).json({
          message: "No addresses provided",
        });
        return;
      }
      function areAllStrings(arr: any[]): boolean {
        return arr.every((item) => typeof item === "string");
      }
      if (Array.isArray(addresses) && !areAllStrings(addresses)) {
        res.status(400).json({
          message: "Addresses array is invalid.",
        });
        return;
      }

      // console.log("addresses: ", addresses);

      const members = await prisma.member.findMany({
        where: {
          walletAddress: {
            in: addresses,
          },
        },
      });

      if (!members) {
        res.status(404).json({
          message: "Member not found",
        });
        return;
      }
      return res.send(members);
    }
  );
  app.get("/get-leaderboard-members", async (req: Request, res: Response) => {
    const members = await prisma.member.findMany({
      orderBy: {
        bountiesWon: "desc",
      },
      where: {
        isFounder: false,
      },
      take: 10,
    });
    res.send(members);
  });
  app.get("/get-leaderboard-founders", async (req: Request, res: Response) => {
    const members = await prisma.member.findMany({
      orderBy: {
        bountiesWon: "desc",
      },
      where: {
        isFounder: true,
      },
      take: 10,
    });
    res.send(members);
  });
  app.post("/create-profile", async (req: Request, res: Response) => {
    const m = req.body as CreateProfilePOSTData;

    const localErrors: string[] = [];
    if (!m.username || m.username.trim().length < 3) {
      localErrors.push("Username must be at least 3 characters long");
    }
    if (!m.firstName || m.firstName.trim().length < 2) {
      localErrors.push("First Name must be at least 2 characters long");
    }
    if (!m.lastName || m.lastName.trim().length < 2) {
      localErrors.push("Last Name must be at least 2 characters long");
    }
    const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (
      !m.email ||
      m.email.trim().length < 2 ||
      !emailReg.test(m.email.trim())
    ) {
      localErrors.push("Email is required and must be valid");
    }

    if (localErrors.length > 0) {
      res.status(400).send(localErrors);
      return;
    }

    const newMember: Member = {
      username: m.username,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      bio: "",
      bountiesWon: 0,
      completedWelcome: true,
      isFounder: false,
      level: 0,
      membersInvited: 0,
      playingRole: RoleType.BountyHunter,
      roles: [RoleType.BountyHunter],
      teamsJoined: 0,
      walletAddress: m.walletAddress,
    };

    const existingUser = await prisma.member.findUnique({
      where: {
        walletAddress: newMember.walletAddress,
      },
    });
    if (!!existingUser) {
      res.status(400).json({ message: "Member already exists" });
      return;
    }

    await prisma.member.create({
      data: newMember,
    });

    console.log("Member created");
    res.json({
      message: "Success",
    });
    console.log();
  });
  app.post("/change-role", async (req: Request, res: Response) => {
    const body = req.body as ChangeRolePOSTData;
    const { role, walletAddress } = body;
    if (!role) {
      res.status(400).json({ message: "Role is required" });
      return;
    }
    if (!walletAddress) {
      res.status(400).json({ message: "Wallet address is required" });
      return;
    }
    if (!Object.values(RoleType).includes(role)) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }
    const member = await prisma.member.update({
      where: {
        walletAddress,
      },
      data: {
        playingRole: role,
      },
    });
    if (!member.roles.includes(role)) {
      return res.status(400).json({ message: "Role is not allowed for you!" });
    }
    if (role === RoleType.Founder) {
      await prisma.member.update({
        where: {
          walletAddress,
        },
        data: {
          isFounder: true,
        },
      });
    }
    if (member) {
      return res.json({
        message: "Success",
      });
    } else {
      return res.status(400).json({ message: "Member not found" });
    }
  });
  app.get("/get-my-bounty-wins/:id", async (req: Request, res: Response) => {
    const walletAddress = req.params.id;
    if (!walletAddress) {
      return res.status(400).json({
        message: "walletAddress is missing",
      });
    }
    const winners = await prisma.bountyWinner.findMany({
      where: {
        bounty: {
          winningSubmission: {
            team: {
              members: {
                some: {
                  walletAddress,
                },
              },
            },
          },
        },
      },
      include: {
        submission: {
          include: {
            team: true,
            bounty: true,
          },
        },
      },
    });

    res.send(winners);
  });
  app.post("/confirm-reward", async (req: Request, res: Response) => {
    const body = req.body as ConfirmRewardPostData;
    const { submissionWinnerID, walletAddress } = body;
    if (!submissionWinnerID) {
      return res.status(400).json({ message: "submissionWinnerID is missing" });
    }
    if (!walletAddress) {
      return res.status(400).json({ message: "walletAddress is missing" });
    }
    const member = await prisma.member.findUnique({
      where: {
        walletAddress,
      },
    });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }
    const bountyWinner = await prisma.bountyWinner.findUnique({
      where: {
        id: submissionWinnerID,
      },
      include: {
        submission: {
          include: {
            team: true,
          },
        },
      },
    });
    if (bountyWinner.submission.team.creatorAddress !== member.walletAddress) {
      res.status(400).json({ message: "You are not the team's creator" });
    }
    const memberUpdate = await prisma.member.update({
      where: {
        walletAddress,
      },
      data: {
        bountiesWon: {
          increment: 1,
        },
      },
    });
    const deletion = await prisma.bountyWinner.delete({
      where: {
        id: submissionWinnerID,
      },
    });
    res.status(200).json({
      message: "Success",
    });
  });
  app.post("/update-my-roles", async (req: Request, res: Response) => {
    const body = req.body as UpdateRolesPostData;

    if (!body.walletAddress) {
      return res.status(400).json({
        message: "walletAddress is missing",
      });
    }
    // Read the blockchain data for which roles are allowed for a user after minting their NFT

    const member = await prisma.member.findUnique({
      where: {
        walletAddress: body.walletAddress,
      },
    });
    return res.status(200).json({
      message: "Success",
    });
  });
}

export async function InviteToTeam(options: {
  teamID: string;
  teamName: string;
  fromAddressName: string;
  fromAddress: string;
  userAddress: string;
}) {
  const {
    teamID,
    fromAddressName: inviterName,
    fromAddress: inviterAddress,
    userAddress,
  } = options;

  const team = await prisma.team.findUnique({
    where: {
      id: teamID,
    },
  });

  // Check if user is already invited
  const existingInvite = await prisma.teamInvite.findFirst({
    where: {
      memberAddress: userAddress,
      AND: {
        toTeamId: teamID,
      },
    },
  });
  if (!!existingInvite) {
    return "Already invited";
  }

  const invite = await prisma.teamInvite.create({
    data: {
      fromAddress: inviterAddress,
      fromName: inviterName,
      toTeamId: teamID,
      toTeamName: team.name,
      member: {
        connect: {
          walletAddress: userAddress,
        },
      },
    },
  });
  if (invite) {
    await prisma.member.update({
      where: {
        walletAddress: userAddress,
      },
      data: {
        membersInvited: {
          increment: 1,
        },
      },
    });
  }
}
