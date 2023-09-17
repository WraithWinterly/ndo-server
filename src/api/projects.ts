import {
  CreateProjectPOSTData,
  BountyMgrSetQuotePricePOSTData,
  BountyMgrDeclineProjectPOSTData,
  FounderConfirmPayPostData,
  Project,
  ProjectStage,
  Member,
  RoleType,
  NotificationType,
} from "../sharedTypes";
import { Collections, app, dbBounties, dbMembers, dbProjects } from "../";

import { Response } from "express";

import {
  ProtectedRequest,
  authenticateToken,
  authenticateMember,
  validateFields,
  include,
} from "../utils";
import { v4 as uuid } from "uuid";
import sendNotification from "./inbox";
export function projectsSetup() {
  app.get(
    "/get-projects",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }

      let data: Array<unknown> = [];

      if (member.playingRole === RoleType.Founder) {
        data = (
          await dbProjects.where("founderID", "==", member.id).get()
        ).docs.map((doc) => doc.data());
      } else if (
        member.playingRole === RoleType.BountyDesigner ||
        member.playingRole === RoleType.BountyManager ||
        member.playingRole === RoleType.BountyValidator
      ) {
        data = (await dbProjects.get()).docs.map((doc) => doc.data());
      }

      return res.send(data);
    }
  );
  app.get(
    "/get-project-by-id/:id",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id) {
        return res.status(400).json({
          message: "No ID provided",
        });
      }

      let data = (await dbProjects.doc(req.params.id).get()).data();

      data = await include({
        data,
        propertyName: "founder",
        propertyNameID: "founderID",
        dbCollection: Collections.Members,
      });

      return res.send(data);
    }
  );
  app.get(
    "/get-bounties-for-project/:id",
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id) {
        return res.status(400).json({
          message: "No ID provided",
        });
      }

      const project = (
        await dbProjects.doc(req.params.id).get()
      ).data() as Project;

      const bountyPromises = project.bountyIDs.map(async (bountyID: string) => {
        const bountySnapshot = await dbBounties.doc(bountyID).get();
        const bounty = bountySnapshot.data();
        if (bounty) {
          bounty.project = project;
          return bounty;
        }
      });

      const bounties = await Promise.all(bountyPromises);
      return res.send(bounties);
    }
  );
  app.post(
    "/create-proposal",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const fields = validateFields<CreateProjectPOSTData>(
        [
          { name: "title", min: 3, max: 20 },
          { name: "description", min: 10 },
          { name: "email", min: 5, max: 20 },
          { name: "phone", min: 10, max: 16 },
        ],
        req.body,
        res
      );
      if (!fields) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const { title, description, email, phone } = fields;

      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      function canProceedCreateProject() {
        let emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
        if (!emailReg.test(email)) return false;
        return true;
      }
      if (!canProceedCreateProject()) {
        return res.status(400).json({ message: "Invalid data" });
      }

      const founderDoc = await dbMembers.doc(member.id).get();
      if (!founderDoc.exists) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      const founder = founderDoc.data() as Member;
      const id = uuid();

      const project: Project = {
        id,
        title,
        description,
        stage: ProjectStage.PendingBountyMgrQuote,
        email,
        phone,
        quotePrice: 0,
        totalFunds: 0,
        founderID: founder.id,
        bountyIDs: [],
        createdAt: new Date(),
      };

      await dbProjects.doc(id).set(project);

      await sendNotification({
        notificationType: NotificationType.ToBM_ProposalCreated,
        projectID: id,
        projectName: title,
      });

      return res.json({
        message: "Success",
      });
    }
  );
  app.post(
    "/bountymgr-set-quote-price",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      const { projectID, quotePrice } =
        validateFields<BountyMgrSetQuotePricePOSTData>(
          [{ name: "projectID" }, { name: "quotePrice", type: "number" }],
          req.body,
          res
        );

      if (!projectID || !quotePrice) {
        return res.status(400).json({ message: "Invalid data" });
      }

      await dbProjects.doc(projectID).update({
        quotePrice,
        stage: ProjectStage.PendingFounderPay,
      });

      await dbMembers.doc(member.id).update({
        level: member.level + 1,
      });

      const proj = (await dbProjects.doc(projectID).get()).data() as Project;
      await sendNotification({
        notificationType: NotificationType.ToFounder_BMQuoted,
        projectID,
        projectName: proj.title,
        founderID: proj.founderID,
      });

      res.json({
        message: "Success",
      });
    }
  );
  app.post(
    "/bountymgr-decline",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const fields = validateFields<BountyMgrDeclineProjectPOSTData>(
        [{ name: "projectID" }],
        req.body,
        res
      );
      if (!fields) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const { projectID } = fields;

      const project = (await dbProjects.doc(projectID).get()).data() as Project;
      sendNotification({
        notificationType: NotificationType.ToFounder_BountyMgrDeclined,
        projectID,
        projectName: project.title,
        founderID: project.founderID,
      });
      await dbProjects.doc(projectID).update({
        stage: ProjectStage.Declined,
        quotePrice: 0,
      });

      return res.json({
        message: "Success",
      });
    }
  );
  app.post(
    "/founder-confirm-pay",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const fields = validateFields<FounderConfirmPayPostData>(
        [{ name: "projectID" }],
        req.body,
        res
      );
      if (!fields) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const { projectID } = fields;

      const member = await authenticateMember(req, res);
      if (!member) {
        return res
          .status(400)
          .json({ message: "You are not authenticated with the server." });
      }
      const projectDoc = await dbProjects.doc(projectID).get();
      if (!projectDoc.exists) {
        return res.status(400).json({ message: "Project not found" });
      }
      const project = projectDoc.data() as Project;
      if (project.founderID !== member.id) {
        return res.status(400).json({ message: "Unauthorized" });
      }
      dbProjects.doc(projectID).update({
        stage: ProjectStage.PendingOfficer,
      });

      await sendNotification({
        notificationType: NotificationType.ToBMOfficer_FounderAcceptedQuote,
        projectID: project.id,
        projectName: project.title,
      });

      res.json({ message: "Success" });
    }
  );
}
