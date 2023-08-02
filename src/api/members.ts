import { Member, RoleType, Team } from "../../prisma/generated";
import { app } from "../";

import * as Types from "../sharedTypes";
import { Request, Response } from "express";

import { v4 as uuid } from "uuid";
import prisma from "../prisma";
import { isAnyArrayBuffer } from "util/types";

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
      const addresses = req.body.addresses as string[];

      console.log("a: ", addresses);
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

      console.log("addresses: ", addresses);

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
      res.send(members);
    }
  );

  app.post("/create-profile", async (req: Request, res: Response) => {
    const m = req.body as Types.CreateProfilePOSTData;

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
      level: 0,
      membersInvited: 0,
      playingRole: RoleType.Founder,
      roles: [],
      teamsJoined: [],
      walletAddress: m.walletAddress,
    };

    const existingUser = await prisma.member.findUnique({
      where: {
        walletAddress: newMember.walletAddress,
      },
    });
    if (!!existingUser) {
      res.status(400).send("Member already exists");
    }

    await prisma.member.create({
      data: newMember,
    });

    console.log("Member created");
    res.status(200).send();
    console.log();
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

  await prisma.teamInvite.create({
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
}
