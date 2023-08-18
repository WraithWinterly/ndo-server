import { app, dbMembers, dbTeamInvites } from "../";

import { Response } from "express";

import {
  ChangeRolePOSTData,
  ConfirmRewardPostData,
  CreateProfilePOSTData,
  Member,
  RoleType,
} from "../sharedTypes";
import {
  ProtectedRequest,
  authenticateToken,
  authenticateMember,
  Field as Fields,
  validateFields,
} from "../utils";

export function membersSetup() {
  app.get(
    "/get-member-by-wallet-address/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id) {
        return res.status(400).json({
          message: "No ID provided",
        });
      }
      const member = await dbMembers.doc(req.params.id).get();

      if (!member) {
        res.status(404).json({
          message: "Member not found",
        });
        return;
      }
      res.send(member);
    }
  );
  app.get(
    "/get-my-profile",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = (await dbMembers.doc(req.walletAddress).get()).data();
      // const memberteamInvites = await teamInvites
      //   .doc(member.teamInviteIds)
      //   .get();
      // const member = await prisma.member.findUnique({
      //   where: {
      //     walletAddress: req.params.id,
      //   },
      //   include: {
      //     teamInvites: true,
      //   },
      // });
      if (!member) {
        res.status(404).json({
          message: "Member not found",
        });
        return;
      }
      res.send({ ...member, teamInvites: [] });
    }
  );
  app.post(
    "/get-members-by-wallet-addresses",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
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

      // const members = await prisma.member.findMany({
      //   where: {
      //     walletAddress: {
      //       in: addresses,
      //     },
      //   },
      // });

      if (!dbMembers) {
        res.status(404).json({
          message: "Member not found",
        });
        return;
      }
      return res.send(dbMembers);
    }
  );
  app.get(
    "/get-leaderboard-members",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      // const members = await prisma.member.findMany({
      //   orderBy: {
      //     bountiesWon: "desc",
      //   },
      //   where: {
      //     isFounder: false,
      //   },
      //   take: 10,
      // });
      // res.send(members);
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.get(
    "/get-leaderboard-founders",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      // const members = await prisma.member.findMany({
      //   orderBy: {
      //     bountiesWon: "desc",
      //   },
      //   where: {
      //     isFounder: true,
      //   },
      //   take: 10,
      // });
      // res.send(members);
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/create-profile",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { email, firstName, lastName, username } =
        validateFields<CreateProfilePOSTData>(
          [
            { name: "email", type: "string", min: 3, max: 255 },
            { name: "firstName", type: "string", min: 2, max: 24 },
            { name: "lastName", type: "string", min: 2, max: 24 },
            { name: "username", type: "string", min: 2, max: 24 },
          ],
          req.body,
          res
        );

      const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
      if (!emailReg.test(email.trim())) {
        return res
          .status(400)
          .json({ message: "Email is required and must be valid" });
      }

      const newMember: Member = {
        username,
        firstName,
        lastName,
        email,
        bio: "",
        bountiesWon: 0,
        isFounder: false,
        level: 0,
        membersInvited: 0,
        playingRole: RoleType.BountyHunter,
        roles: [RoleType.BountyHunter],
        teamsJoined: 0,
        walletAddress: req.walletAddress,
        teamInviteIds: [],
        createdTeamIds: [],
        teamsIds: [],
        bountyWinnerIDs: [],
      };

      // const existingUser = await prisma.member.findUnique({
      //   where: {
      //     walletAddress: newMember.walletAddress,
      //   },
      // });
      // if (!!existingUser) {
      //   res.status(400).json({ message: "Member already exists" });
      //   return;
      // }

      // await prisma.member.create({
      //   data: newMember,
      // });

      console.log("Member created");
      res.json({
        message: "Success",
      });
      console.log();
    }
  );
  app.post(
    "/change-role",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { role } = validateFields<ChangeRolePOSTData>(
        [{ name: "role" }],
        req.body,
        res
      );
      //@ts-ignore
      if (!Object.values(RoleType).includes(role)) {
        res.status(400).json({ message: "Invalid role" });
        return;
      }

      const member = await authenticateMember(req, res);

      // const updatedMember = await prisma.member.update({
      //   where: {
      //     walletAddress: member.walletAddress,
      //   },
      //   data: {
      //     playingRole: role,
      //   },
      // });
      // if (!member.roles.includes(role)) {
      //   return res
      //     .status(400)
      //     .json({ message: "Role is not allowed for you!" });
      // }
      // if (role === RoleType.Founder) {
      //   await prisma.member.update({
      //     where: {
      //       walletAddress: member.walletAddress,
      //     },
      //     data: {
      //       isFounder: true,
      //     },
      //   });
      // }
      // if (updatedMember) {
      //   return res.json({
      //     message: "Success",
      //   });
      // } else {
      //   return res.status(400).json({ message: "Member not found" });
      // }
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.get(
    "/get-my-bounty-wins",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      // const walletAddress = req.params.id;
      // if (!walletAddress) {
      //   return res.status(400).json({
      //     message: "walletAddress is missing",
      //   });
      // }
      // const winners = await prisma.bountyWinner.findMany({
      //   where: {
      //     bounty: {
      //       winningSubmission: {
      //         team: {
      //           members: {
      //             some: {
      //               walletAddress,
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      //   include: {
      //     submission: {
      //       include: {
      //         team: true,
      //         bounty: true,
      //       },
      //     },
      //   },
      // });

      // res.send(winners);
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/confirm-reward",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      // const { submissionWinnerID } = validateFields<ConfirmRewardPostData>(
      //   [{ name: "submissionWinnerID" }],
      //   req.body,
      //   res
      // );

      // const member = await authenticateMember(req, res);

      // const bountyWinner = await prisma.bountyWinner.findUnique({
      //   where: {
      //     id: submissionWinnerID,
      //   },
      //   include: {
      //     submission: {
      //       include: {
      //         team: true,
      //       },
      //     },
      //   },
      // });
      // if (
      //   bountyWinner.submission.team.creatorAddress !== member.walletAddress
      // ) {
      //   res.status(400).json({ message: "You are not the team's creator" });
      // }
      // const memberUpdate = await prisma.member.update({
      //   where: {
      //     walletAddress: member.walletAddress,
      //   },
      //   data: {
      //     bountiesWon: {
      //       increment: 1,
      //     },
      //   },
      // });
      // const deletion = await prisma.bountyWinner.delete({
      //   where: {
      //     id: submissionWinnerID,
      //   },
      // });
      // res.status(200).json({
      //   message: "Success",
      // });
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/update-my-roles",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      //   const member = authenticateMember(req, res);

      //   // Read the blockchain data for which roles are allowed for a user after minting their NFT

      //   return res.status(200).json({
      //     message: "Success",
      //   });
      // }
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
}

export async function InviteToTeam(options: {
  teamID: string;
  teamName: string;
  fromAddressName: string;
  fromAddress: string;
  userAddress: string;
}) {
  // const {
  //   teamID,
  //   fromAddressName: inviterName,
  //   fromAddress: inviterAddress,
  //   userAddress,
  // } = options;
  // const team = await prisma.team.findUnique({
  //   where: {
  //     id: teamID,
  //   },
  // });
  // // Check if user is already invited
  // const existingInvite = await prisma.teamInvite.findFirst({
  //   where: {
  //     memberAddress: userAddress,
  //     AND: {
  //       toTeamId: teamID,
  //     },
  //   },
  // });
  // if (!!existingInvite) {
  //   return "Already invited";
  // }
  // const invite = await prisma.teamInvite.create({
  //   data: {
  //     fromAddress: inviterAddress,
  //     fromName: inviterName,
  //     toTeamId: teamID,
  //     toTeamName: team.name,
  //     member: {
  //       connect: {
  //         walletAddress: userAddress,
  //       },
  //     },
  //   },
  // });
  // if (invite) {
  //   await prisma.member.update({
  //     where: {
  //       walletAddress: userAddress,
  //     },
  //     data: {
  //       membersInvited: {
  //         increment: 1,
  //       },
  //     },
  //   });
  // }
}
