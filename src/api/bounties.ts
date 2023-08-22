import {
  Collections,
  app,
  db,
  dbBounties,
  dbBountyWinners,
  dbProjects,
  dbSubmissions,
  dbTeams,
  dbTestCases,
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
  TestCase,
  BountyWinner,
} from "../sharedTypes";
import { v4 as uuid } from "uuid";
import {
  ProtectedRequest,
  authenticateToken,
  authenticateMember as authenticateMember,
  validateFields,
  include,
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
      // console.log(withProj);
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
      });
      console.log("dime pues ", bounty.submissionIDs);
      bounty = await include({
        data: bounty,
        propertyName: "winningSubmission",
        propertyNameID: "winningSubmissionID",
        dbCollection: Collections.Bounties,
      });
      bounty.submissions = (await include({
        data: bounty.submissions,
        propertyName: "team",
        propertyNameID: "teamID",
        dbCollection: Collections.Teams,
      })) as Object[];

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
        return res
          .sendStatus(400)
          .json({ message: "You are not the team owner." });

      const bountyDoc = await dbBounties.doc(bountyID).get();
      if (!bountyDoc.exists) {
        return res.status(400).json({ message: "Bounty not found" });
      }
      const bounty = bountyDoc.data() as Bounty;

      if (bounty.stage !== BountyStage.Active)
        return res.sendStatus(400).json({ message: "Bounty not active" });
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
      const startDate = new Date(bounty.postDate);
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

      const newBounty: Bounty = {
        id,
        title: bounty.title,
        description: bounty.description,
        aboutProject: bounty.aboutProject,
        reward: bounty.reward,
        deadline: bounty.deadline,
        headerSections: bounty.headerSections,
        postDate: new Date(),
        types: bounty.types,
        stage: draft ? BountyStage.Draft : BountyStage.PendingApproval,
        approvedByFounder: false,
        approvedByManager: false,
        approvedByValidator: false,
        projectID: bounty.projectID,
        bountyWinnerID: [],
        founderAddress: member.walletAddress,
        participantsTeamIDs: [],
        submissionIDs: [],
        testCases: [],
        winningSubmissionID: "",
      };
      await dbBounties.doc(id).set(newBounty);
      const proj = (
        await dbProjects.doc(bounty.projectID).get()
      ).data() as Project;
      await dbProjects.doc(bounty.projectID).update({
        bountyIDs: proj.bountyIDs.concat(id),
      });
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
  app.post(
    "/add-test-cases",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      const { bountyID, testCases } = validateFields<SetTestCasesPostData>(
        [{ name: "bountyID" }, { name: "testCases", type: "array" }],
        req.body,
        res
      );

      if (member.playingRole != RoleType.BountyValidator) {
        return res
          .status(400)
          .json({ message: "You are not allowed to add test cases." });
      }
      const bountyDoc = await dbBounties.doc(bountyID).get();
      if (!bountyDoc.exists) {
        return res.status(400).json({ message: "Bounty not found" });
      }
      let bounty = bountyDoc.data() as Bounty;

      if (bounty.stage !== BountyStage.Active) {
        return res
          .status(400)
          .json({ message: "Bounty is not active anymore!" });
      }

      await dbBounties.doc(bountyID).update({
        testCases: testCases,
      });
      let updatedBounty = (await dbBounties.doc(bountyID).get()).data();
      updatedBounty = await include({
        data: updatedBounty,
        propertyName: "submissions",
        propertyNameID: "submissionIDs",
        dbCollection: Collections.Submissions,
      });
      updatedBounty.submissions = await include({
        data: updatedBounty.submissions,
        propertyName: "testCases",
        propertyNameID: "testCaseIDs",
        dbCollection: Collections.TestCases,
      });
      const tUpdatedBounty = updatedBounty as Bounty & {
        submissions: (Submission & {
          testCases: TestCase[];
        })[];
      };
      tUpdatedBounty.submissions.forEach(async (submission) => {
        submission.testCases.forEach(async (testCase) => {
          await dbTestCases.doc(testCase.id).delete();
        });
      });

      tUpdatedBounty.submissions.forEach(async (submission) => {
        bounty.testCases.forEach(async (testCase) => {
          const id = uuid();
          await dbTestCases.doc(id).set({
            id,
            text: testCase,
            approved: false,
            submissionID: submission.id,
          });
        });
      });
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
      console.log(submissionDocs);
      const submissions = submissionDocs.docs.map((doc) => doc.data());

      res.send(submissions);
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

      const id = uuid();
      await dbSubmissions.doc(id).create({
        id,
        videoDemo: videoDemo,
        repo: repo,
        bountyID: bountyID,
        createdAt: new Date(),
        teamID: teamID,
        testCaseIDs: [],
        bountyWinnerID: "",
        winningSubmissionID: "",
      } as Submission);

      await dbBounties.doc(bountyID).update({
        submissionIDs: bounty.submissionIDs.concat(id),
      });

      bounty.testCases.forEach(async (testCase) => {
        const id = uuid();
        await dbTestCases.doc(id).set({
          id,
          text: testCase,
          approved: false,
          submissionID: id,
        });
      });

      res.status(200).json({ message: "Success" });
    }
  );
  app.get(
    "/get-test-cases/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      if (!req.params.id) {
        return res.status(400).json({
          message: "submissionID is missing",
        });
      }
      const submissionID = req.params.id;

      if (
        member.playingRole != RoleType.BountyValidator &&
        member.playingRole != RoleType.BountyManager &&
        member.playingRole != RoleType.Founder
      ) {
        return res
          .status(400)
          .json({ message: "You are not allowed to view test cases." });
      }

      const testCaseDocs = await dbTestCases
        .where("submissionID", "==", submissionID)
        .get();
      const testCases = testCaseDocs.docs.map((doc) => doc.data());

      res.send(testCases);
    }
  );
  app.post(
    "/approve-test-cases",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { submissionID, testCases } =
        validateFields<ApproveTestCasePostData>(
          [{ name: "submissionID" }, { name: "testCases", type: "array" }],
          req.body,
          res
        );

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
      let submission = submissionDoc.data();
      submission = await include({
        data: submission,
        propertyName: "bounty",
        propertyNameID: "bountyID",
        dbCollection: Collections.Bounties,
      });
      const tSubmission = submission as Submission & {
        bounty: Bounty;
      };

      const validCases = testCases.filter((testCase) =>
        tSubmission.bounty.testCases.includes(testCase.text)
      );

      if (validCases.length != submission.bounty.testCases.length) {
        return res.status(400).json({ message: "Invalid test cases" });
      }
      console.log(testCases);
      testCases.forEach(async (testCase) => {
        const exists = (await dbTestCases.doc(testCase.id).get()).exists;
        if (exists)
          await dbTestCases.doc(testCase.id).update({
            approved: testCase.approved,
          });
      });
      res.status(200).json({ message: "Success" });
    }
  );
  app.post(
    "/validator-select-winning-submission",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { submissionID } = validateFields<SelectWinningSubmissionPostData>(
        [{ name: "submissionID" }],
        req.body,
        res
      );

      const member = await authenticateMember(req, res);

      if (member.playingRole != RoleType.BountyValidator) {
        return res.status(400).json({
          message: "You are not allowed to select the winning submission.",
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

      if (!submission) {
        return res.status(400).json({ message: "Submission not found" });
      }
      if (submission.bounty.stage !== BountyStage.Active) {
        return res.status(400).json({ message: "Bounty is not active" });
      }
      if (submission.team.creatorAddress !== member.walletAddress) {
        return res.status(400).json({
          message: "You are not a authorized to select the winning submission.",
        });
      }
      if (submission.winningSubmissionID !== "") {
        const winnerDoc = await dbSubmissions
          .doc(submission.winningSubmissionID)
          .get();
        if (winnerDoc.exists) {
          return res.status(400).json({
            message: "You have already selected the winning submission.",
          });
        }
        const winner = await winnerDoc.data();

        if (winner.length > 0) {
          return res.status(400).json({
            message: "You have already selected the winning submission.",
          });
        }
        const id = uuid();
        const bountyWinner: BountyWinner = {
          approvedByFounder: false,
          approvedByManager: false,
          bountyID: submission.bountyID,
          confirmed: false,
          memberAddress: submission.team.creatorAddress,
          submissionID: submission.id,
          id,
        };
        await dbBountyWinners.doc(id).create(bountyWinner);

        res.status(200).json({ message: "Success" });
      }
    }
  );
  app.get(
    "/get-winner-by-bounty/:id",
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

      res.send(bounty);
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
      if (approve === false) {
        await dbBountyWinners.doc(submission.bountyID).delete();
      } else {
        let data: BountyWinner | undefined;
        if (member.playingRole === RoleType.Founder) {
          await dbBountyWinners.doc(submission.bountyID).update({
            approvedByFounder: true,
          });
        } else if (member.playingRole === RoleType.BountyManager) {
          await dbBountyWinners.doc(submission.bountyID).update({
            approvedByManager: true,
          });
        }
        if (data.approvedByFounder && data.approvedByManager) {
          // We know its confirmed
          await dbBountyWinners.doc(submission.bountyID).update({
            stage: BountyStage.Completed,
            winningSubmission: submission.id,
          });
          await dbBountyWinners.doc(submission.bountyID).update({
            confirmed: true,
          });
          await dbBountyWinners.doc(submission.bountyID).update({
            stage: BountyStage.Completed,
          });
        }
      }
      res.status(200).json({ message: "Success" });
    }
  );
}
