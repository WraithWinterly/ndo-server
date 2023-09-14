import { Request, Response } from "express";
import { Collections, app, dbBounties, dbProjects, dbSubmissions } from "..";
import {
  Bounty,
  BountyStage,
  Member,
  NotificationType,
  OfficerConfirmBountyWinnerPOSTData,
  OfficerConfirmProjectPaidPOSTData,
  Project,
  ProjectStage,
  Submission,
  SubmissionState,
  Team,
} from "../sharedTypes";
import {
  ProtectedRequest,
  authenticateMember,
  authenticateToken,
  include,
  validateFields,
} from "../utils";
import sendNotification from "./inbox";

export function officerSetup() {
  app.get(
    "/get-officer-items",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);

      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      if (!member.financialOfficer) {
        return res.status(400).json({ message: "You are not an officer." });
      }
      let projectsWaitingPay = (
        await dbProjects.where("stage", "==", ProjectStage.PendingOfficer).get()
      ).docs.map((doc) => doc.data());

      projectsWaitingPay = (await include({
        data: projectsWaitingPay,
        dbCollection: Collections.Members,
        propertyName: "founder",
        propertyNameID: "founderID",
      })) as (Project & { founder: Member })[];

      let winningSubmissionsWaitingPay = (
        await dbSubmissions
          .where("state", "==", SubmissionState.WinnerAndRewardPendingOfficer)
          .get()
      ).docs.map((doc) => doc.data());

      winningSubmissionsWaitingPay = (await include({
        data: winningSubmissionsWaitingPay,
        dbCollection: Collections.Bounties,
        propertyName: "bounty",
        propertyNameID: "bountyID",
      })) as (Submission & { bounty: Bounty })[];

      const projectPromises = winningSubmissionsWaitingPay.map(
        async (submission) => {
          submission.bounty = (await include({
            data: submission.bounty,
            propertyName: "project",
            propertyNameID: "projectID",
            dbCollection: Collections.Projects,
          })) as Bounty & { project: Project };

          return submission; // Return updated submission
        }
      );
      await Promise.all(projectPromises);

      winningSubmissionsWaitingPay = (await include({
        data: winningSubmissionsWaitingPay,
        dbCollection: Collections.Teams,
        propertyName: "team",
        propertyNameID: "teamID",
      })) as (Submission & { bounty: Bounty; team: Team })[];

      const creatorPromises = winningSubmissionsWaitingPay.map(
        async (submission) => {
          submission.team = await include({
            data: submission.team,
            propertyName: "creator",
            propertyNameID: "creatorID",
            dbCollection: Collections.Members,
          });
        }
      );
      await Promise.all(creatorPromises);

      winningSubmissionsWaitingPay =
        winningSubmissionsWaitingPay as (Submission & {
          bounty: Bounty & { project: Project };
          team: Team & {
            creator: Member;
          };
        })[];

      return res.send({
        projects: projectsWaitingPay,
        submissions: winningSubmissionsWaitingPay,
      });
    }
  );
  app.post(
    "/officer-confirm-project-paid",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      if (!member.financialOfficer) {
        return res.status(400).json({ message: "You are not an officer." });
      }

      console.log("here");

      const body = validateFields<OfficerConfirmProjectPaidPOSTData>(
        [{ name: "projectID" }],
        req.body,
        res
      );
      const project = (await dbProjects.doc(body.projectID).get()).data();

      if (project.stage === ProjectStage.PendingOfficer) {
        await dbProjects.doc(body.projectID).update({
          stage: ProjectStage.PendingBountyDesign,
          // By SCOBY Protocol, the received amount will be 85%.
          totalFunds: project.quotePrice * 0.85,
        });
      }

      await sendNotification({
        notificationType: NotificationType.ToBMBDFounder_ReadyForBountyDesign,
        projectID: body.projectID,
        projectName: project.title,
        founderID: project.founderID,
      });

      return res.status(200).json({ message: "Success" });
    }
  );
  app.post(
    "/officer-confirm-bounty-winner-paid",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      if (!member.financialOfficer) {
        return res.status(400).json({ message: "You are not an officer." });
      }

      const body = validateFields<OfficerConfirmBountyWinnerPOSTData>(
        [{ name: "submissionID" }],
        req.body,
        res
      );

      const submission = (
        await dbSubmissions.doc(body.submissionID).get()
      ).data() as Submission;

      if (submission.state === SubmissionState.WinnerAndRewardPendingOfficer) {
        await dbSubmissions.doc(body.submissionID).update({
          state: SubmissionState.WinnerAndRewardDone,
        });
      }

      return res.status(200).json({ message: "Success" });
    }
  );
}
