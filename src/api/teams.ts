import { Collections, app, dbTeams } from "..";
import {
  CreateTeamPOSTData,
  InviteToTeamPOSTData,
  JoinTeamPOSTData,
} from "../sharedTypes";
import { type Response } from "express";
import { InviteToTeam } from "./members";

import {
  ProtectedRequest,
  authenticateMember,
  authenticateToken,
  includeSingle,
  includeSingleArray,
  validateFields,
} from "../utils";

export function teamsSetup() {
  app.get(
    "/get-teams",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      // const teams = await prisma.team.findMany({
      //   include: {
      //     members: {
      //       select: {
      //         walletAddress: true,
      //       },
      //     },
      //   },
      //   orderBy: {
      //     createdAt: "desc",
      //   },
      // });
      const teams = (await dbTeams.get()).docs
        .map((doc) => doc.data())
        .reverse();
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

      // const team = await prisma.team.findUnique({
      //   where: {
      //     id: req.params.id,
      //   },
      //   include: {
      //     members: true,
      //   },
      // });

      let team = (await dbTeams.doc(req.params.id).get()).data();
      team = await includeSingleArray({
        data: team,
        propertyName: "members",
        propertyNameID: "memberIDs",
        dbCollection: Collections.Members,
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
    // async (req: ProtectedRequest, res: Response) => {
    //   const {
    //     name,
    //     description,
    //     creatorAddress,
    //     link,
    //     memberAddressesToInvite,
    //   } = validateFields<CreateTeamPOSTData>(
    //     [
    //       { name: "name" },
    //       { name: "description" },
    //       { name: "creatorAddress" },
    //       { name: "link" },
    //       { name: "memberAddressesToInvite" },
    //     ],
    //     req.body,
    //     res
    //   );
    //   try {
    //     const linkRegex = /^(ftp|http|https):\/\/[^ "]+$/;

    //     if (!linkRegex.test(link))
    //       return res.send(400).json({
    //         message: "Invalid link sent to server",
    //       });

    //     const user = await prisma.member.findUnique({
    //       where: {
    //         walletAddress: creatorAddress,
    //       },
    //     });

    //     const createdTeam = await prisma.team.create({
    //       data: {
    //         name,
    //         description,
    //         link: link,
    //         creator: {
    //           connect: {
    //             walletAddress: creatorAddress,
    //           },
    //         },
    //         members: {
    //           connect: {
    //             walletAddress: creatorAddress,
    //           },
    //         },
    //       },
    //     });

    //     // Send notification to the users
    //     memberAddressesToInvite.forEach((address) => {
    //       try {
    //         InviteToTeam({
    //           fromAddress: creatorAddress,
    //           fromAddressName: user.firstName,
    //           teamID: createdTeam.id,
    //           teamName: createdTeam.name,
    //           userAddress: address,
    //         });
    //       } catch (e) {
    //         console.error(e);
    //         return res.sendStatus(400).json({
    //           message: "Failed to send invites to members",
    //         });
    //       }
    //     });
    //     res.json({
    //       message: "Success",
    //     });
    //   } catch (e) {
    //     console.log(e);
    //     res.send(400).json(e);
    //   }
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/invite-to-team",
    authenticateToken,
    // async (req: ProtectedRequest, res: Response) => {
    //   const { toAddress, toTeam } = validateFields<InviteToTeamPOSTData>(
    //     [{ name: "toAddress" }, { name: "toTeam" }],
    //     req.body,
    //     res
    //   );
    //   const member = await authenticateMember(req, res);

    //   try {
    //     const fromUser = await prisma.member.findUnique({
    //       where: {
    //         walletAddress: member.walletAddress,
    //       },
    //     });
    //     const team = await prisma.team.findUnique({
    //       where: {
    //         id: toTeam,
    //       },
    //     });

    //     const error = await InviteToTeam({
    //       fromAddress: member.walletAddress,
    //       fromAddressName: fromUser.firstName,
    //       teamID: toTeam,
    //       teamName: team.name,
    //       userAddress: toAddress,
    //     });
    //     if (error?.length > 0) {
    //       console.error(error);
    //       // throw error;
    //       // return res.send(400).json({
    //       //   message: "Failed to invite member to team",
    //       // });
    //     }

    //     res.json({
    //       message: "Success",
    //     });
    //   } catch (e) {
    //     console.error(e);
    //     return res.sendStatus(400);
    //   }
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/join-team-from-invite",
    authenticateToken,
    // async (req: ProtectedRequest, res: Response) => {
    //   teamInvite(req, res, "accept");
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/deny-team-from-invite",
    authenticateToken,
    // async (req: ProtectedRequest, res: Response) => {
    //   teamInvite(req, res, "reject");
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.get(
    "/get-team-pending-invites/:id",
    // async (req: ProtectedRequest, res: Response) => {
    //   console.log("test");
    //   if (!req.params.id)
    //     return res.send(400).json({
    //       message: "No team ID provided",
    //     });
    //   const invites = await prisma.teamInvite.findMany({
    //     where: {
    //       toTeamId: req.params.id,
    //     },
    //   });
    //   res.send(invites);
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
}

// async function teamInvite(
//   req: ProtectedRequest,
//   res: Response,
//   type: "accept" | "reject"
// ) {
//   const { toTeamID } = validateFields<JoinTeamPOSTData>(
//     [{ name: "toTeamID" }],
//     req.body,
//     res
//   );
//   const authMember = await authenticateMember(req, res);
//   // Ensure correct body data
//   const member = await prisma.member.findUnique({
//     where: {
//       walletAddress: authMember.walletAddress,
//     },
//     include: {
//       teams: true,
//     },
//   });
//   if (!member) return res.status(400).json({ message: "User not found" });
//   try {
//     const team = await prisma.team.findUnique({
//       where: {
//         id: toTeamID,
//       },
//       include: {
//         members: true,
//       },
//     });
//     // Remove their pending invite
//     await prisma.teamInvite.deleteMany({
//       where: {
//         fromAddress: authMember.walletAddress,
//         AND: {
//           toTeamId: toTeamID,
//         },
//       },
//     });

//     // If they accept, add them to the team
//     if (type === "accept") {
//       // Add to team

//       await prisma.team.update({
//         where: {
//           id: team.id,
//         },
//         data: {
//           members: {
//             connect: { walletAddress: authMember.walletAddress },
//           },
//         },
//       });
//       // Update teamsJoined stat
//       await prisma.member.update({
//         where: {
//           walletAddress: authMember.walletAddress,
//         },
//         data: {
//           teamsJoined: Number(member.teams.length),
//         },
//       });
//     }
//     console.log("Success");
//     res.json({
//       message: "Success",
//     });
//   } catch (e) {
//     console.error(e);
//     return res.sendStatus(400);
//   }
// }
