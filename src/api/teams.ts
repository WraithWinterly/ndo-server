import { Collections, app, dbMembers, dbTeamInvites, dbTeams } from "..";
import {
  CreateTeamPOSTData,
  InviteToTeamPOSTData,
  JoinTeamPOSTData,
  Member,
  Team,
  TeamInvite,
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
      const member = await authenticateMember(req, res);
      let teams: Array<Team>;
      if (member.admin && member.adminec) {
        teams = (await dbTeams.get()).docs.map((doc) =>
          doc.data()
        ) as Array<Team>;
      } else {
        teams = (
          await dbTeams.where("memberIDs", "array-contains", member.id).get()
        ).docs.map((doc) => doc.data()) as Array<Team>;
      }
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
        return res.status(404).json({ message: "Team not found" });
      }

      return res.send(team);
    }
  );
  app.post(
    "/create-team",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      const { name, description, link } = validateFields<CreateTeamPOSTData>(
        [{ name: "name" }, { name: "description" }, { name: "link" }],
        req.body,
        res
      );
      try {
        const linkRegex = /^(ftp|http|https):\/\/[^ "]+$/;

        if (!linkRegex.test(link))
          return res.status(400).json({
            message: "Invalid link sent to server",
          });
        const id = uuid();
        const createdTeam: Team = {
          id,
          name,
          description,
          link: link,
          creatorID: member.id,
          createdAt: new Date(),
          memberIDs: [member.id],
          submissionIDs: [],
        };
        dbTeams.doc(createdTeam.id).set(createdTeam);

        await dbMembers.doc(member.id).update({
          teamsJoined: member.teamsJoined + 1,
          teamIDs: member.teamIDs.concat(id),
        });

        res.json({
          message: "Success",
        });
      } catch (e) {
        console.error(e);
        res.status(400).json(e);
      }
    }
  );
  app.post(
    "/invite-to-team",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { toMemberID, toTeamID } = validateFields<InviteToTeamPOSTData>(
        [{ name: "toMemberID" }, { name: "toTeamID" }],
        req.body,
        res
      );
      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      const team = (await dbTeams.doc(toTeamID).get()).data();
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      if (team.creatorID !== member.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      console.log(team.memberIDs);
      if (team.memberIDs.includes(toMemberID)) {
        return res
          .status(400)
          .json({ message: "Already in the team. No need to invite." });
      }
      const existingInviteDocs = await dbTeamInvites
        .where("toMemberID", "==", toMemberID)
        .where("toTeamID", "==", toTeamID)
        .get();
      const existingInvites = existingInviteDocs.docs.map((doc) => doc.data());

      if (existingInvites.length > 0) {
        return res.status(400).json({ message: "Already invited" });
      }
      const error = await InviteToTeam({
        fromMemberID: member.id,
        fromMemberName: member.firstName,
        toTeamID,
        toTeamName: team.name,
        toMemberID,
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
    async (req: ProtectedRequest, res: Response) => {
      joinOrRejectTeamInvite(req, res, "accept");
    }
  );
  app.post(
    "/deny-team-from-invite",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      joinOrRejectTeamInvite(req, res, "reject");
    }
  );
  app.get(
    "/get-team-pending-invites/:id",
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id)
        return res.status(400).json({
          message: "No team ID provided",
        });
      const inviteDocs = await dbTeamInvites
        .where("toTeamID", "==", req.params.id)
        .get();
      const inviteDataArray = inviteDocs.docs.map((doc) => doc.data());

      res.send(inviteDataArray);
    }
  );
}

async function joinOrRejectTeamInvite(
  req: ProtectedRequest,
  res: Response,
  type: "accept" | "reject"
) {
  const authMember = await authenticateMember(req, res);
  const { toTeamID } = validateFields<JoinTeamPOSTData>(
    [{ name: "toTeamID" }],
    req.body,
    res
  );

  // Ensure correct body data
  const memberWithTeams = (await include({
    data: authMember,
    propertyName: "teams",
    propertyNameID: "teamIDs",
    dbCollection: Collections.Teams,
  })) as Member & { teams: Team[] };

  try {
    let teamDoc = await dbTeams.doc(toTeamID).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ message: "Team not found" });
    }
    let team = teamDoc.data();
    team = await include({
      data: team,
      propertyName: "members",
      propertyNameID: "memberIDs",
      dbCollection: Collections.Members,
    });

    const invites = await dbTeamInvites
      .where("toMemberID", "==", authMember.id)
      .where("toTeamID", "==", toTeamID)
      .get();
    const inviteData = invites.docs.map((doc) => doc.data()) as TeamInvite[];
    if (inviteData.length === 0) {
      return res.status(404).json({ message: "No Invite found" });
    }
    invites.docs.forEach((doc) => {
      doc.ref.delete();
    });

    // Remove their pending invite
    // If they accept, add them to the team
    if (type === "accept") {
      // Add to team
      if (!team.memberIDs.includes(authMember.id)) {
        await dbTeams.doc(team.id).update({
          memberIDs: team.memberIDs.concat(authMember.id),
        });
        await dbMembers.doc(authMember.id).update({
          teamsJoined: authMember.teamsJoined + 1,
          teamIDs: memberWithTeams.teamIDs.concat(team.id),
        });
      }
    }

    // Remove team invite ID after joining
    await dbMembers.doc(authMember.id).update({
      teamInviteIDs: authMember.teamInviteIDs.filter((invite) => {
        return inviteData
          .map((invite) => {
            return invite.id;
          })
          .includes(invite);
      }),
    });

    const newValueWithoutUsInvites = authMember.teamIDs.filter((teamID) => {
      return inviteData
        .map((invite) => {
          return invite.toTeamID;
        })
        .includes(teamID);
    });

    await dbMembers
      .doc(authMember.id)
      .update({ teamInviteIDs: newValueWithoutUsInvites });

    res.json({
      message: "Success",
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: "Failed to join team" });
  }
}
