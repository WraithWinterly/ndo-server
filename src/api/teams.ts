import { Collections, app, dbTeams } from "..";
import {
  CreateTeamPOSTData,
  InviteToTeamPOSTData,
  JoinTeamPOSTData,
  Member,
  Team,
} from "../sharedTypes";
import { type Response } from "express";
import { InviteToTeam } from "./members";
import { v4 as uuid } from "uuid";
import {
  ProtectedRequest,
  authenticateMember,
  authenticateToken,
  include,
  validateFields,
} from "../utils";

export function teamsSetup() {
  app.get(
    "/get-teams",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      let teams = (await dbTeams.get()).docs.map((doc) => doc.data()).reverse();
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

      let team = (await dbTeams.doc(req.params.id).get()).data();
      team = await include({
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
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      const { name, description, link } = validateFields<CreateTeamPOSTData>(
        [{ name: "name" }, { name: "description" }, { name: "link" }],
        req.body,
        res
      );
      try {
        const linkRegex = /^(ftp|http|https):\/\/[^ "]+$/;

        if (!linkRegex.test(link))
          return res.send(400).json({
            message: "Invalid link sent to server",
          });

        const createdTeam: Team = {
          id: uuid(),
          name,
          description,
          link: link,
          creatorAddress: member.walletAddress,
          createdAt: new Date(),
          memberIDs: [member.walletAddress],
          submissionIDs: [],
        };
        dbTeams.doc(createdTeam.id).set(createdTeam);

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
      const { toAddress, toTeam } = validateFields<InviteToTeamPOSTData>(
        [{ name: "toAddress" }, { name: "toTeam" }],
        req.body,
        res
      );
      const member = await authenticateMember(req, res);
      const team = (await dbTeams.doc(toTeam).get()).data();
      if (!team) {
        return res.send(404).json({ message: "Team not found" });
      }

      const error = await InviteToTeam({
        fromAddress: member.walletAddress,
        fromAddressName: member.firstName,
        teamID: toTeam,
        teamName: team.name,
        toMemberAddress: toAddress,
      });
      if (error?.length > 0) {
        console.error(error);
        // throw error;
        return res.status(400).json({
          message: "Failed to invite member to team",
        });
      } else {
        return res.status(200).json({ message: "Success" });
      }
    },
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
