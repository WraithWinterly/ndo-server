import {
  CreateProjectPOSTData,
  BountyMgrSetQuotePricePOSTData,
  BountyMgrDeclineProjectPOSTData,
  FounderConfirmPayPostData,
  Project,
  ProjectStage,
  Member,
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
export function projectsSetup() {
  app.get(
    "/get-projects",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const data = (await dbProjects.get()).docs
        .map((doc) => doc.data())
        ?.reverse();

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
        propertyNameID: "founderWalletAddress",
        dbCollection: Collections.Members,
      });

      return res.send(data);
    }
  );
  app.get(
    "/get-bounties-for-project/:id",
    async (req: ProtectedRequest, res: Response) => {
      if (!req.params.id) {
        return res.send(400).json({
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
      const { title, description, email, phone } =
        validateFields<CreateProjectPOSTData>(
          [
            { name: "title", min: 3, max: 20 },
            { name: "description", min: 10 },
            { name: "email", min: 5, max: 20 },
            { name: "phone", min: 10, max: 16 },
          ],
          req.body,
          res
        );
      const member = await authenticateMember(req, res);
      function canProceedCreateProject() {
        let emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
        if (!emailReg.test(email)) return false;
        return true;
      }
      if (!canProceedCreateProject()) {
        return res.status(400).json({ message: "Invalid data" });
      }

      const founderDoc = await dbMembers.doc(member.walletAddress).get();
      if (!founderDoc.exists) {
        return res.status(400).json({ message: "Member not found" });
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
        founderWalletAddress: founder.walletAddress,
        bountyIDs: [],
        createdAt: new Date(),
      };
      await dbProjects.doc(id).set(project);
      return res.json({
        message: "Success",
      });
    }
  );
  app.post(
    "/bountymgr-set-quote-price",
    async (req: ProtectedRequest, res: Response) => {
      const { projectID, quotePrice } =
        validateFields<BountyMgrSetQuotePricePOSTData>(
          [{ name: "projectID" }, { name: "quotePrice", type: "number" }],
          req.body,
          res
        );
      if (!projectID || !quotePrice) {
        return res.sendStatus(400);
      }
      await dbProjects.doc(projectID).update({
        quotePrice,
        stage: ProjectStage.PendingFounderPay,
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
      const { projectID } = validateFields<BountyMgrDeclineProjectPOSTData>(
        [{ name: "projectID" }],
        req.body,
        res
      );
      await dbProjects.doc(projectID).update({
        stage: ProjectStage.Declined,
        quotePrice: 0,
      });

      res.json({
        message: "Success",
      });
    }
  );
  app.post(
    "/founder-confirm-pay",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const { projectID } = validateFields<FounderConfirmPayPostData>(
        [{ name: "projectID" }],
        req.body,
        res
      );

      const member = await authenticateMember(req, res);
      const projectDoc = await dbProjects.doc(projectID).get();
      if (!projectDoc.exists) {
        return res.status(400).json({ message: "Project not found" });
      }
      const project = projectDoc.data() as Project;
      if (project.founderWalletAddress !== member.walletAddress) {
        return res.status(400).json({ message: "Unauthorized" });
      }
      dbProjects.doc(projectID).update({
        stage: ProjectStage.PendingBountyDesign,
      });

      res.json({ message: "Success" });
    }
  );
}
