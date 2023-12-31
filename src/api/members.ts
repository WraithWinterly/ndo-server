import {
  Collections,
  app,
  db,
  dbMembers,
  dbSubmissions,
  dbTeamInvites,
  dbTeams,
} from "../";

import { Response } from "express";

import {
  Bounty,
  ChangeRolePOSTData,
  ConfirmRewardPostData,
  CreateProfilePOSTData,
  Member,
  RoleType,
  Submission,
  SubmissionState,
  Team,
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
    "/verify-auth",
    authenticateToken,
    (req: ProtectedRequest, res: Response) => {
      if (req.walletAddress) {
        return res.send({ verified: true });
      }
      return res.send({ verified: false });
    }
  );
  app.get(
    "/get-member-by-wallet-address/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id) {
        return res.status(400).json({
          message: "No ID provided",
        });
      }
      let member = (await dbMembers.doc(req.params.id).get()).data() as Member;
      // Obfuscate email
      if (!!member) {
        member = {
          ...member,
          email: "",
          teamIDs: [],
        };
      }

      if (!member) {
        res.status(404).json({
          message: "You are not authenticated with the server.",
        });
        return;
      }
      res.send(member);
    }
  );
  app.get(
    "/get-members-by-username/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id) {
        return res.status(400).json({
          message: "No ID provided",
        });
      }

      const username = req.params.id.toLowerCase() as string;

      let members = (
        await dbMembers
          .orderBy("username", "asc")
          .startAt(username)
          .endAt(username + "\uf8ff")
          .get()
      ).docs.map((doc) => doc.data());
      console.log(members);
      res.send(members);
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
          message: "You are not authenticated with the server.",
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
          message: "You are not authenticated with the server.",
        });
        return;
      }
      const members: Array<Member> = [];
      const fetchPromises = addresses.map(async (address) => {
        const foundDoc = await dbMembers.doc(address).get();

        if (foundDoc.exists) {
          let found = foundDoc.data() as Member;
          found = {
            ...found,
            email: "",
            teamIDs: [],
          };
          members.push(found as Member);
        }
      });

      await Promise.all(fetchPromises); // Wait for all asynchronous operations to complete

      // console.log(members);
      return res.send(members);
    }
  );
  app.get(
    "/get-leaderboard-members",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const memberDocs = await dbMembers
        .orderBy("level", "desc")
        .limit(100)
        .where("isFounder", "==", false)
        .get();
      let members = memberDocs.docs.map((doc) => doc.data()) as Member[];
      members = members.map((member) => {
        return {
          ...member,
          email: "",
          teamIDs: [],
        };
      });

      res.send(members);
    }
  );
  app.get(
    "/get-leaderboard-founders",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const memberDocs = await dbMembers
        .orderBy("level", "desc")
        .limit(100)
        .where("isFounder", "==", true)
        .get();
      let members = memberDocs.docs.map((doc) => doc.data()) as Member[];
      members = members.map((member) => {
        return {
          ...member,
          email: "",
          teamIDs: [],
        };
      });

      res.send(members);
    }
  );
  app.post(
    "/create-profile",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const fields = validateFields<CreateProfilePOSTData>(
        [
          { name: "email", type: "string", min: 3, max: 255 },
          { name: "firstName", type: "string", min: 2, max: 24 },
          { name: "lastName", type: "string", min: 2, max: 24 },
          { name: "username", type: "string", min: 2, max: 24 },
        ],
        req.body,
        res
      );
      if (!fields) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const { email, firstName, lastName, username } = fields;
      const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
      if (!emailReg.test(email.trim())) {
        return res
          .status(400)
          .json({ message: "Email is required and must be valid" });
      }

      const newMember: Member = {
        username: username.toLowerCase().replace(/[^a-z0-9]/g, ""),
        firstName: firstName.replace(/[^a-zA-Z]/g, ""),
        lastName: lastName.replace(/[^a-zA-Z]/g, ""),
        email: email.toLowerCase(),
        bio: "",
        bountiesWon: 0,
        isFounder: false,
        financialOfficer: false,
        level: 0,
        membersInvited: 0,
        playingRole: RoleType.BountyHunter,
        roles: [RoleType.BountyHunter],
        teamsJoined: 0,
        id: req.walletAddress,
        teamInviteIDs: [],
        teamIDs: [],
        admin: false,
        adminec: false,
        notificationIDs: [],
      };
      const existingUser = await dbMembers.doc(req.walletAddress).get();
      if (existingUser.exists) {
        return res.status(400).json({ message: "Member already exists" });
      }

      await dbMembers.doc(req.walletAddress).set(newMember);

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
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }

      if (!member.roles.includes(role)) {
        return res
          .status(400)
          .json({ message: "Role is not allowed for you!" });
      }
      const updatedMember = await dbMembers.doc(member.id).update({
        playingRole: role,
      });

      if (role === RoleType.Founder) {
        await dbMembers.doc(member.id).update({
          isFounder: true,
        });
      }

      if (updatedMember) {
        return res.json({
          message: "Success",
        });
      } else {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
    }
  );
  app.get(
    "/get-my-bounty-wins",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      let member = (await authenticateMember(req, res)) as any;
      member = (await include({
        data: member,
        propertyName: "teams",
        propertyNameID: "teamIDs",
        dbCollection: Collections.Teams,
      })) as Member & { team: Team[] };

      let winners = [];
      let submissionIDs: Array<string> = [];
      for (const team of member.teams as Team[]) {
        submissionIDs = submissionIDs.concat(team.submissionIDs as string[]);
      }

      if (!!member.teams) {
        for (const submissionID of submissionIDs) {
          let data = (await dbSubmissions.doc(submissionID).get()).data();
          if (!data || data.state !== SubmissionState.WinnerConfirmed) {
            continue;
          }

          data = await include({
            data: data,
            dbCollection: Collections.Bounties,
            propertyName: "bounty",
            propertyNameID: "bountyID",
          });
          data = await include({
            data: data,
            dbCollection: Collections.Teams,
            propertyName: "team",
            propertyNameID: "teamID",
          });
          data = data as Submission & { team: Team; bounty: Bounty };
          winners.push(data);
        }
      }

      return res.send(winners);
    }
  );
  app.post(
    "/confirm-reward",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const fields = validateFields<ConfirmRewardPostData>(
        [{ name: "submissionID" }],
        req.body,
        res
      );
      if (!fields) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const { submissionID } = fields;

      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }

      const submissionDoc = await dbSubmissions.doc(submissionID).get();
      if (!submissionDoc.exists) {
        return res.status(400).json({ message: "Submission not found" });
      }
      let submission = submissionDoc.data();
      submission = await include({
        data: submission,
        propertyName: "team",
        propertyNameID: "teamID",
        dbCollection: Collections.Teams,
      });
      if (submission.state != SubmissionState.WinnerConfirmed) {
        return res.status(400).json({ message: "Submission not confirmed" });
      }

      if (submission.team.creatorID !== member.id) {
        return res
          .status(400)
          .json({ message: "You are not the team's creator" });
      }

      submission.team.memberIDs.forEach(async (memberID: string) => {
        const localMember = (await dbMembers.doc(memberID).get()).data();
        if (!!member) {
          await dbMembers.doc(memberID).update({
            bountiesWon: localMember.bountiesWon + 1,
            level: localMember.level + 1,
          });
        }
      });

      await dbSubmissions
        .doc(submissionID)
        .update({ state: SubmissionState.WinnerAndRewardPendingOfficer });

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
  toTeamID: string;
  toTeamName: string;
  fromMemberName: string;
  fromMemberID: string;
  toMemberID: string;
}) {
  const { toTeamID, fromMemberName, fromMemberID, toMemberID } = options;
  const team = (await dbTeams.doc(toTeamID).get()).data();
  // Check if user is already invited

  const existingInvite = await dbTeamInvites
    .where("toMemberID", "==", toMemberID)
    .where("toTeamID", "==", toTeamID)
    .get();
  if (existingInvite.size > 0) {
    return "Already invited";
  }
  const id = uuid();
  await dbTeamInvites.doc(id).create({
    id,
    fromMemberID: fromMemberID,
    fromMemberName: fromMemberName,
    toTeamID: toTeamID,
    toTeamName: team.name,
    toMemberID: toMemberID,
  } as TeamInvite);

  const toMember = (await dbMembers.doc(toMemberID).get()).data();
  await dbMembers.doc(toMemberID).update({
    teamInviteIDs: toMember.teamInviteIDs.concat([id]),
  });

  const member = (await dbMembers.doc(fromMemberID).get()).data();
  await dbMembers.doc(fromMemberID).update({
    membersInvited: member.membersInvited + 1,
  });
}
