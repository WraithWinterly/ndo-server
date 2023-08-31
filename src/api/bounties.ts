import {
  Collections,
  app,
  db,
  dbBounties,
  dbMembers,
  dbProjects,
  dbSubmissions,
  dbTeams,
} from "..";

import { type Response } from "express";
import {
  SetApproveBountyPostData,
  CreateBountyPostData,
  StartBountyPOSTData,
  SetTestCasesPostData,
  SubmitDeliverablesPostData,
  ApproveTestCasePostData,
  SelectWinningSubmissionPostData,
  ApproveDisapproveBountyWinnerPostData,
  Bounty,
  Project,
  BountyStage,
  RoleType,
  ProjectStage,
  Submission,
  Team,
  SubmissionState,
} from "../sharedTypes";
import { v4 as uuid } from "uuid";
import {
  ProtectedRequest,
  authenticateToken,
  authenticateMember as authenticateMember,
  validateFields,
  include,
  fromFireDate,
} from "../utils";

export function bountiesSetup() {
  app.get(
    "/get-bounties",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      let data = (await dbBounties.get()).docs.map((doc) => doc.data());
      data = (await include({
        data,
        propertyName: "project",
        propertyNameID: "projectID",
        dbCollection: Collections.Projects,
      })) as Object[];

      return res.send(data);
    }
  );
  app.get(
    "/get-bounty-by-id/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      // Called when a user clicks 'view details' on a bounty. req.params.id is the Bounty ID.

      // If it is not provided, return 400.
      if (!req.params.id) return res.status(400).json({ message: "No ID" });
      const member = await authenticateMember(req, res);
      // Find the bounty from the database

      let bounty = (await dbBounties.doc(req.params.id).get()).data();
      bounty = await include({
        data: bounty,
        propertyName: "project",
        propertyNameID: "projectID",
        dbCollection: Collections.Projects,
      });
      bounty = await include({
        data: bounty,
        propertyName: "founder",
        propertyNameID: "founderAddress",
        dbCollection: Collections.Members,
      });

      bounty = await include({
        data: bounty,
        propertyName: "submissions",
        propertyNameID: "submissionIDs",
        dbCollection: Collections.Submissions,
        select: [
          "id",
          "createdAt",
          "state",
          "teamID",
          "testCases",
          member.playingRole != RoleType.Founder &&
            member.playingRole != RoleType.BountyHunter &&
            "repo",
          "videoDemo",
        ],
      });
      bounty.submissions = (await include({
        data: bounty.submissions,
        propertyName: "team",
        propertyNameID: "teamID",
        dbCollection: Collections.Teams,
        select: ["name"],
      })) as Object[];
      if (bounty.winningSubmissionID.length > 0) {
        bounty = await include({
          data: bounty,
          propertyName: "winningSubmission",
          propertyNameID: "winningSubmissionID",
          dbCollection: Collections.Submissions,
        });
        if (!!bounty.winningSubmission) {
          bounty.winningSubmission = await include({
            data: bounty.winningSubmission,
            propertyName: "team",
            propertyNameID: "teamID",
            dbCollection: Collections.Teams,
          });
        }
      }

      return res.send(bounty);
    }
  );
  app.post(
    "/start-bounty",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      const { forTeam, bountyID } = validateFields<StartBountyPOSTData>(
        [{ name: "forTeam" }, { name: "bountyID" }],
        req.body,
        res
      );

      const team = (await dbTeams.doc(forTeam).get()).data();

      if (member.walletAddress != team.creatorAddress)
        return res.status(400).json({ message: "You are not the team owner." });

      const bountyDoc = await dbBounties.doc(bountyID).get();
      if (!bountyDoc.exists) {
        return res.status(400).json({ message: "Bounty not found" });
      }
      const bounty = bountyDoc.data() as Bounty;

      if (bounty.stage !== BountyStage.Active)
        return res.status(400).json({ message: "Bounty not active" });

      if (
        (fromFireDate(bounty.startDate)?.getTime() || 0) > new Date().getTime()
      )
        return res.status(400).json({ message: "Bounty has not started yet" });

      await dbBounties.doc(bountyID).update({
        participantsTeamIDs: bounty.participantsTeamIDs.concat(team.id),
      });

      res.status(200).json({
        message: "Success",
      });
    }
  );
  app.post(
    "/create-bounty",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      const { bounty, draft } = validateFields<CreateBountyPostData>(
        [
          { name: "bounty", type: "nocheck" },
          { name: "draft", type: "boolean" },
        ],
        req.body,
        res
      );

      // Define the list of required fields for the bounty
      const requiredFields = [
        "title",
        "description",
        "aboutProject",
        "reward",
        "types",
        "projectID",
        "startDate",
        "deadline",
        "headerSections",
      ];

      // Check if all required fields are present in the bounty data
      const missingFields = requiredFields.filter(
        (field) => !bounty.hasOwnProperty(field)
      );

      // If any required field is missing, return an error response
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Data ${missingFields.join(", ")} is missing in bounty`,
        });
      }

      // You would ensure member is a bounty designer creating a bounty here

      // Also check the validity of specific fields (e.g., startDate and deadline)
      // Validation for startDate and deadline
      const startDate = new Date(bounty.startDate);
      const deadline = new Date(bounty.deadline);

      if (startDate > deadline) {
        return res
          .status(400)
          .json({ message: "Deadline must be after the start date" });
      }
      const projectDoc = await dbProjects.doc(bounty.projectID).get();

      if (!projectDoc.exists) {
        return res.status(400).json({ message: "Project not found" });
      }

      const project = projectDoc.data() as Project;
      const bountyDocs = await dbBounties
        .where("projectID", "==", bounty.projectID)
        .get();
      const bounties = bountyDocs.docs.map((doc) => doc.data());

      let reward = project.quotePrice;
      if (reward <= 0) {
        return res.status(400).json({ message: "Invalid reward amount" });
      }

      const withoutMe = bounties?.filter((b) => b.id !== bounty?.id);
      withoutMe?.forEach((bounty) => {
        reward -= bounty.reward;
      });

      if (bounty.reward > reward) {
        return res.status(400).json({ message: "Reward amount is too high" });
      }
      const id = bounty.id ? bounty.id : uuid();
      const bountyStartDate = new Date(bounty.startDate);
      bountyStartDate.setUTCHours(0, 0, 0, 0);
      const bountyDeadline = new Date(bounty.deadline);
      bountyDeadline.setUTCHours(0, 0, 0, 0);

      const newBounty: Bounty = {
        id,
        title: bounty.title,
        description: bounty.description,
        aboutProject: bounty.aboutProject,
        createdAt: new Date(),
        reward: bounty.reward,
        deadline: bountyDeadline,
        headerSections: bounty.headerSections,
        startDate: bountyStartDate,
        types: bounty.types,
        stage: draft ? BountyStage.Draft : BountyStage.PendingApproval,
        approvedByFounder: false,
        approvedByManager: false,
        approvedByValidator: false,
        projectID: bounty.projectID,
        founderAddress: member.walletAddress,
        participantsTeamIDs: [],
        submissionIDs: [],
        winningSubmissionID: "",
      };
      await dbBounties.doc(id).set(newBounty);
      const proj = (
        await dbProjects.doc(bounty.projectID).get()
      ).data() as Project;
      if (!proj.bountyIDs.includes(id)) {
        await dbProjects.doc(bounty.projectID).update({
          bountyIDs: proj.bountyIDs.concat(id),
        });
      }

      // Return success response
      return res.status(200).json({ message: "Bounty created successfully" });
    }
  );
  app.post(
    "/set-bounty-approval",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      const { approve, bountyID } = validateFields<SetApproveBountyPostData>(
        [{ name: "approve", type: "boolean" }, { name: "bountyID" }],
        req.body,
        res
      );

      const allowedApprovedRoles = [
        RoleType.BountyManager,
        RoleType.BountyValidator,
        RoleType.Founder,
      ];

      if (!allowedApprovedRoles.includes(member.playingRole)) {
        return res
          .status(400)
          .json({ message: "You are not allowed to approve this bounty" });
      }

      const bountyDoc = await dbBounties.doc(bountyID).get();
      if (!bountyDoc.exists) {
        return res.status(400).json({ message: "Bounty not found" });
      }
      const bounty = bountyDoc.data() as Bounty;

      if (bounty.stage !== BountyStage.PendingApproval) {
        return res
          .status(400)
          .json({ message: "Bounty is not pending approvals anymore!" });
      }

      switch (member.playingRole) {
        case RoleType.Founder:
          await dbBounties.doc(bountyID).update({
            approvedByFounder: approve ? true : false,
          });
          break;
        case RoleType.BountyManager:
          await dbBounties.doc(bountyID).update({
            approvedByManager: approve ? true : false,
          });
          break;
        case RoleType.BountyValidator:
          await dbBounties.doc(bountyID).update({
            approvedByValidator: approve ? true : false,
          });
          break;
      }
      const updatedBounty = (
        await dbBounties.doc(bountyID).get()
      ).data() as Bounty;
      if (
        updatedBounty.approvedByFounder &&
        updatedBounty.approvedByManager &&
        updatedBounty.approvedByValidator
      ) {
        await dbBounties.doc(bountyID).update({
          stage: BountyStage.Active,
        });
        await dbProjects.doc(bounty.projectID).update({
          stage: ProjectStage.Ready,
        });
      }
      res.status(200).json({ message: "Success" });
    }
  );
  app.get(
    "/get-submission/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      if (!req.params.id) {
        return res.status(400).json({
          message: "teamID, bountyID separated by comma is missing",
        });
      }
      const ids = req.params.id.split(",");
      const teamID = ids[0];
      const bountyID = ids[1];

      if (!teamID || !bountyID) {
        return res.status(400).json({
          message: "teamID, bountyID separated by comma is missing",
        });
      }
      const submissionDocs = await dbSubmissions
        .where("teamID", "==", teamID)
        .where("bountyID", "==", bountyID)
        .get();

      const submissions = submissionDocs.docs.map((doc) => doc.data());
      if (submissions.length === 0) {
        return res.send(undefined);
      } else {
        res.send(submissions);
      }
    }
  );
  app.get(
    "/get-submission-by-id/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      if (!req.params.id) {
        return res.status(400).json({
          message: "teamID, bountyID separated by comma is missing",
        });
      }
      const id = req.params.id;

      const submissionDoc = await dbSubmissions.doc(id).get();

      let submission = submissionDoc.data();
      submission = (await include({
        data: submission,
        propertyName: "team",
        propertyNameID: "teamID",
        dbCollection: Collections.Teams,
        select: ["name"],
      })) as Submission & { name: string };

      if (member.playingRole === RoleType.Founder) {
        submission.repo = undefined;
      }
      res.send(submission);
    }
  );
  app.post(
    "/submit-deliverables",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { bountyID, teamID, videoDemo, repo } =
        validateFields<SubmitDeliverablesPostData>(
          [
            { name: "bountyID" },
            { name: "teamID" },
            { name: "videoDemo" },
            { name: "repo" },
          ],
          req.body,
          res
        );
      const member = await authenticateMember(req, res);

      const teamDoc = await dbTeams.doc(teamID).get();

      if (!teamDoc.exists) {
        return res.status(400).json({ message: "Team not found" });
      }
      const team = teamDoc.data() as Team;

      if (team.creatorAddress !== member.walletAddress) {
        return res.status(400).json({
          message:
            "You are not a authorized to submit deliverables for the team",
        });
      }

      const bountyDoc = await dbBounties.doc(bountyID).get();

      if (!bountyDoc.exists) {
        return res.status(400).json({ message: "Bounty not found" });
      }
      const bounty = bountyDoc.data() as Bounty;

      if (bounty.stage !== BountyStage.Active) {
        return res
          .status(400)
          .json({ message: "Bounty is not active anymore!" });
      }

      await dbSubmissions
        .where("id", "==", bountyID)
        .where("teamID", "==", teamID)
        .get()
        .then((docs) => {
          docs.forEach((doc) => {
            doc.ref.delete();
          });
        });

      let submissionID = uuid();

      await dbSubmissions.doc(submissionID).create({
        id: submissionID,
        videoDemo: videoDemo,
        repo: repo,
        bountyID: bountyID,
        createdAt: new Date(),
        teamID: teamID,
        testCases: [],
        state: SubmissionState.Pending,
        reason: "",
        isWinnerApprovedByFounder: false,
        isWinnerApprovedByManager: false,
      } as Submission);

      await dbTeams.doc(teamID).update({
        submissionIDs: team.submissionIDs.concat(submissionID),
      });
      await dbBounties.doc(bountyID).update({
        submissionIDs: bounty.submissionIDs.concat(submissionID),
      });
      const idArray: string[] = [];

      dbSubmissions.doc(submissionID).update({
        testCaseIDs: idArray,
      });

      res.status(200).json({ message: "Success" });
    }
  );

  app.post(
    "/approve-test-cases",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { submissionID, testCases, reason, type } =
        validateFields<ApproveTestCasePostData>(
          [
            { name: "submissionID" },
            { name: "testCases", type: "array" },
            { name: "reason" },
            { name: "type" },
          ],
          req.body,
          res
        );
      if (type != "approve" && type != "reject" && type != "approve-winner") {
        return res.status(400).json({ message: "Invalid type" });
      }

      const member = await authenticateMember(req, res);

      if (member.playingRole != RoleType.BountyValidator) {
        return res
          .status(400)
          .json({ message: "You are not allowed to approve test cases." });
      }

      const submissionDoc = await dbSubmissions.doc(submissionID).get();
      if (!submissionDoc.exists) {
        return res.status(400).json({ message: "Submission not found" });
      }
      dbSubmissions.doc(submissionID).update({
        testCases,
      });
      let untypedSubmission = (
        await dbSubmissions.doc(submissionID).get()
      ).data();
      untypedSubmission = await include({
        data: untypedSubmission,
        propertyName: "bounty",
        propertyNameID: "bountyID",
        dbCollection: Collections.Bounties,
      });
      untypedSubmission = await include({
        data: untypedSubmission,
        propertyName: "team",
        propertyNameID: "teamID",
        dbCollection: Collections.Teams,
      });
      const submission = untypedSubmission as Submission & {
        team: Team;
        bounty: Bounty;
      };

      if (type === "approve") {
        if (
          submission.state === SubmissionState.Pending ||
          submission.state === SubmissionState.Rejected
        ) {
          dbSubmissions.doc(submissionID).update({
            state: SubmissionState.Approved,
            testCases,
            reason,
          });
        } else {
          dbSubmissions.doc(submissionID).update({
            testCases,
            reason,
          });
        }
        await dbMembers.doc(member.walletAddress).update({
          level: member.level + 1,
        });

        return res.status(200).json({ message: "Success" });
      } else if (type === "reject") {
        dbSubmissions.doc(submissionID).update({
          state: SubmissionState.Rejected,
          testCases,
          reason,
        });
        if (
          submission.state === SubmissionState.WinnerAndRewardClaimed ||
          submission.state === SubmissionState.WinnerConfirmed
        ) {
          await dbSubmissions
            .doc(submission.bounty.winningSubmissionID)
            .update({
              isWinnerApprovedByFounder: false,
              isWinnerApprovedByManager: false,
              // Set the state as approved, but not a winner
              state: SubmissionState.Approved,
              testCases,
              reason,
            });
          await dbBounties.doc(submission.bountyID).update({
            winningSubmissionID: "",
          });
        }
        return res.status(200).json({ message: "Success" });
      } else if (type === "approve-winner") {
        if (submission.bounty.winningSubmissionID === "") {
          const id = uuid();

          await dbSubmissions
            .doc(submissionID)
            .update({ state: SubmissionState.WinnerPendingConfirmation });

          const team = (
            await dbTeams.doc(submission.teamID).get()
          ).data() as Team;
          await dbTeams.doc(submission.teamID).update({
            winningSubmissionIDs: team.winningSubmissionIDs.concat(id),
          });
          await dbBounties.doc(submission.bountyID).update({
            winningSubmissionID: submissionID,
          });
          await dbMembers.doc(member.walletAddress).update({
            level: member.level + 2,
          });
          res.status(200).json({ message: "Success" });
          return;
        } else {
          return res.status(400).json({
            message: "You have already selected the winning submission.",
          });
        }
      }
    }
  );

  app.get(
    "/get-bounty-winning-submission/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id) {
        return res.status(400).json({
          message: "bountyID is missing",
        });
      }
      const bountyID = req.params.id;
      const bountyDoc = await dbBounties.doc(bountyID).get();
      if (!bountyDoc.exists) {
        return res.status(400).json({ message: "Bounty not found" });
      }
      const bounty = bountyDoc.data() as Bounty;
      if (bounty.winningSubmissionID === "") {
        return res.send(undefined);
      }
      const submission = (
        await dbSubmissions.doc(bounty.winningSubmissionID).get()
      ).data();
      return res.send(submission.data());
    }
  );
  app.post(
    "/approve-disapprove-bounty-winner",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { approve, submissionID } =
        validateFields<ApproveDisapproveBountyWinnerPostData>(
          [{ name: "approve", type: "boolean" }, { name: "submissionID" }],
          req.body,
          res
        );
      const member = await authenticateMember(req, res);

      if (
        member.playingRole != RoleType.BountyValidator &&
        member.playingRole != RoleType.BountyManager &&
        member.playingRole != RoleType.Founder
      ) {
        return res.status(400).json({
          message:
            "You are not allowed to approve or disapprove bounty winners.",
        });
      }
      const submissionDoc = await dbSubmissions.doc(submissionID).get();
      if (!submissionDoc.exists) {
        return res.status(400).json({ message: "Submission not found" });
      }
      let submission = submissionDoc.data();
      submission = await include({
        data: submission,
        propertyName: "bounty",
        propertyNameID: "bountyID",
        dbCollection: Collections.Bounties,
      });
      submission = await include({
        data: submission,
        propertyName: "team",
        propertyNameID: "teamID",
        dbCollection: Collections.Teams,
      });

      if (submission.bounty.stage !== BountyStage.Active) {
        return res.status(400).json({ message: "Bounty is not active" });
      }
      if (submission.state !== SubmissionState.WinnerPendingConfirmation) {
        return res.status(400).json({
          message: "Submission is not pending confirmation",
        });
      }
      if (approve === false) {
        await dbSubmissions.doc(submission.bounty.winningSubmissionID).update({
          isWinnerApprovedByFounder: false,
          isWinnerApprovedByManager: false,
          // Set the state as approved, but not a winner
          state: SubmissionState.Approved,
        });
        await dbBounties.doc(submission.bountyID).update({
          winningSubmissionID: "",
        });
      } else {
        if (member.playingRole === RoleType.Founder) {
          await dbSubmissions
            .doc(submission.bounty.winningSubmissionID)
            .update({
              isWinnerApprovedByFounder: true,
            });
        } else if (member.playingRole === RoleType.BountyManager) {
          await dbSubmissions
            .doc(submission.bounty.winningSubmissionID)
            .update({
              isWinnerApprovedByManager: true,
            });
        }
        let data = (await dbSubmissions.doc(submissionID).get()).data();
        if (
          data.isWinnerApprovedByFounder &&
          data.isWinnerApprovedByManager &&
          data.state === SubmissionState.WinnerPendingConfirmation
        ) {
          // We know its confirmed
          await dbSubmissions
            .doc(submission.bounty.winningSubmissionID)
            .update({
              state: SubmissionState.WinnerConfirmed,
            });
          await dbBounties.doc(submission.bountyID).update({
            stage: BountyStage.Completed,
          });
        }
      }
      res.status(200).json({ message: "Success" });
    }
  );
}
