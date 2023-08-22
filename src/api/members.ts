import {
  Collections,
  app,
  db,
  dbBountyWinners,
  dbMembers,
  dbTeamInvites,
  dbTeams,
} from "../";

import { Response } from "express";

import {
  ChangeRolePOSTData,
  ConfirmRewardPostData,
  CreateProfilePOSTData,
  Member,
  RoleType,
  TeamInvite,
} from "../sharedTypes";
import {
  ProtectedRequest,
  authenticateToken,
  authenticateMember,
  Field as Fields,
  validateFields,
  include,
} from "../utils";
import { v4 as uuid } from "uuid";
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
      const member = (await dbMembers.doc(req.params.id).get()).data();

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
      let member = (await dbMembers.doc(req.walletAddress).get()).data();
      member = await include({
        data: member,
        propertyName: "teamInvites",
        propertyNameID: "teamInviteIDs",
        dbCollection: Collections.TeamInvites,
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
      const memberDocs = await dbMembers
        .orderBy("bountiesWon", "desc")
        .limit(10)
        .where("isFounder", "==", "false")
        .get();
      const members = memberDocs.docs.map((doc) => doc.data());
      res.send(members);
    }
  );
  app.get(
    "/get-leaderboard-founders",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const memberDocs = await dbMembers
        .orderBy("bountiesWon", "desc")
        .limit(10)
        .where("isFounder", "==", "true")
        .get();
      const members = memberDocs.docs.map((doc) => doc.data());
      res.send(members);
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
        teamInviteIDs: [],
        createdTeamIDs: [],
        teamIDs: [],
        bountyWinnerIDs: [],
      };
      const existingUser = await dbMembers.doc(req.walletAddress).get();
      if (existingUser.exists) {
        return res.status(400).json({ message: "Member already exists" });
      }

      await dbMembers.doc(req.walletAddress).set(newMember);

      console.log("Member created");
      res.json({
        message: "Success",
      });
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

      if (!member.roles.includes(role)) {
        return res
          .status(400)
          .json({ message: "Role is not allowed for you!" });
      }
      const updatedMember = await dbMembers.doc(member.walletAddress).update({
        playingRole: role,
      });

      if (role === RoleType.Founder) {
        await dbMembers.doc(member.walletAddress).update({
          isFounder: true,
        });
      }

      if (updatedMember) {
        return res.json({
          message: "Success",
        });
      } else {
        return res.status(400).json({ message: "Member not found" });
      }
    }
  );
  app.get(
    "/get-my-bounty-wins",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const user = await authenticateMember(req, res);
      // console.log(user);

      let winners = [];
      if (!!user.bountyWinnerIDs) {
        for (const item of user.bountyWinnerIDs) {
          let data = (await dbBountyWinners.doc(item).get()).data();
          data = include({
            data,
            dbCollection: Collections.Submissions,
            propertyName: "submission",
            propertyNameID: "submissionID",
          });
          if (data.submission) {
            data.submission = include({
              data: data.submission,
              dbCollection: Collections.Bounties,
              propertyName: "bounty",
              propertyNameID: "bountyID",
            });
            data.submission = include({
              data: data.submission,
              dbCollection: Collections.Teams,
              propertyName: "team",
              propertyNameID: "teamID",
            });
          }

          winners.push(data);
        }
      }

      res.send(winners);
    }
  );
  app.post(
    "/confirm-reward",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { submissionWinnerID } = validateFields<ConfirmRewardPostData>(
        [{ name: "submissionWinnerID" }],
        req.body,
        res
      );

      const member = await authenticateMember(req, res);

      const bountyWinnerDoc = await dbBountyWinners
        .doc(submissionWinnerID)
        .get();
      if (!bountyWinnerDoc.exists) {
        return res.status(400).json({ message: "Submission not found" });
      }
      let bountyWinner = bountyWinnerDoc.data();
      bountyWinner = include({
        data: bountyWinner,
        propertyName: "submission",
        propertyNameID: "submissionID",
        dbCollection: Collections.Submissions,
      });
      bountyWinner.submission = include({
        data: bountyWinner.submission,
        propertyName: "team",
        propertyNameID: "teamID",
        dbCollection: Collections.Teams,
      });

      if (
        bountyWinner.submission.team.creatorAddress !== member.walletAddress
      ) {
        res.status(400).json({ message: "You are not the team's creator" });
      }

      await dbMembers.doc(member.walletAddress).update({
        bountiesWon: member.bountiesWon + 1,
      });
      await dbBountyWinners.doc(submissionWinnerID).delete();

      res.status(200).json({
        message: "Success",
      });
    }
  );
  app.post(
    "/update-my-roles",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = authenticateMember(req, res);

      //   // Read the blockchain data for which roles are allowed for a user after minting their NFT

      return res.status(200).json({
        message: "Success",
      });
    }
  );
}

export async function InviteToTeam(options: {
  teamID: string;
  teamName: string;
  fromAddressName: string;
  fromAddress: string;
  toMemberAddress: string;
}) {
  const {
    teamID,
    fromAddressName: inviterName,
    fromAddress: inviterAddress,
    toMemberAddress,
  } = options;
  const team = (await dbTeams.doc(teamID).get()).data();
  // Check if user is already invited

  const existingInvite = await dbTeamInvites
    .where("memberAddress", "==", toMemberAddress)
    .where("toTeamID", "==", teamID)
    .get();
  if (existingInvite.size > 0) {
    return "Already invited";
  }
  const id = uuid();
  await dbTeamInvites.doc(id).create({
    id,
    fromAddress: inviterAddress,
    fromName: inviterName,
    toTeamID: teamID,
    toTeamName: team.name,
    toMemberAddress,
  } as TeamInvite);

  const toMember = (await dbMembers.doc(toMemberAddress).get()).data();
  await dbMembers.doc(toMemberAddress).update({
    teamInviteIDs: toMember.teamInviteIDs.concat([id]),
  });

  const member = (await dbMembers.doc(inviterAddress).get()).data();
  await dbMembers.doc(toMemberAddress).update({
    membersInvited: member.membersInvited + 1,
  });
}
