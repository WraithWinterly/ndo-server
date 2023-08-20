import {
  CreateProjectPOSTData,
  BountyMgrSetQuotePricePOSTData,
  BountyMgrDeclineProjectPOSTData,
  FounderConfirmPayPostData,
  Project,
} from "../sharedTypes";
import { Collections, app, dbBounties, dbProjects } from "../";

import { Response } from "express";

import {
  ProtectedRequest,
  authenticateToken,
  authenticateMember,
  validateFields,
  includeSingle,
  includeMany,
} from "../utils";

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
        return res.send(400).json({
          message: "No ID provided",
        });
      }

      let data = (await dbProjects.doc(req.params.id).get()).data();

      data = await includeSingle({
        data,
        propertyName: "founder",
        propertyNameID: "founderWalletAddress",
        dbCollection: Collections.Members,
      });
      console.log(data);
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
      // const bounties = await prisma.bounty.findMany({
      //   where: {
      //     projectId: req.params.id,
      //   },
      //   include: {
      //     project: true,
      //   },
      // });
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
    // async (req: ProtectedRequest, res: Response) => {
    //   const { title, description, email, phone } =
    //     validateFields<CreateProjectPOSTData>(
    //       [
    //         { name: "title", min: 3, max: 20 },
    //         { name: "description", min: 10 },
    //         { name: "email", min: 5, max: 20 },
    //         { name: "phone", min: 10, max: 16 },
    //       ],
    //       req.body,
    //       res
    //     );
    //   const member = await authenticateMember(req, res);
    //   function canProceedCreateProject() {
    //     let emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    //     if (!emailReg.test(email)) return false;
    //     return true;
    //   }
    //   if (!canProceedCreateProject())
    //     return res.status(400).json({ message: "Invalid data" });
    //   const founder = await prisma.member.findUnique({
    //     where: {
    //       walletAddress: member.walletAddress,
    //     },
    //   });
    //   await prisma.project.create({
    //     data: {
    //       title,
    //       description,
    //       stage: ProjectStage.PendingBountyMgrQuote,
    //       email,
    //       phone,
    //       quotePrice: 0,
    //       founder: {
    //         connect: {
    //           walletAddress: founder.walletAddress,
    //         },
    //       },
    //     },
    //   });

    //   res.json({
    //     message: "Success",
    //   });
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/bountymgr-set-quote-price",
    // async (req: ProtectedRequest, res: Response) => {
    //   const { projectID, quotePrice } =
    //     validateFields<BountyMgrSetQuotePricePOSTData>(
    //       [{ name: "projectID" }, { name: "quotePrice", type: "number" }],
    //       req.body,
    //       res
    //     );
    //   if (!projectID || !quotePrice) {
    //     return res.sendStatus(400);
    //   }
    //   await prisma.project.update({
    //     where: {
    //       id: projectID,
    //     },
    //     data: {
    //       quotePrice,
    //       stage: ProjectStage.PendingFounderPay,
    //     },
    //   });

    //   res.json({
    //     message: "Success",
    //   });
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/bountymgr-decline",
    authenticateToken,
    // async (req: ProtectedRequest, res: Response) => {
    //   const { projectID } = validateFields<BountyMgrDeclineProjectPOSTData>(
    //     [{ name: "projectID" }],
    //     req.body,
    //     res
    //   );

    //   const proj = await prisma.project.update({
    //     where: {
    //       id: projectID,
    //     },
    //     data: {
    //       stage: "Declined",
    //       quotePrice: 0,
    //     },
    //   });

    //   res.json({
    //     message: "Success",
    //   });
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
  app.post(
    "/founder-confirm-pay",
    authenticateToken,
    // async (req: ProtectedRequest, res: Response) => {
    //   const { projectID } = validateFields<FounderConfirmPayPostData>(
    //     [{ name: "projectID" }],
    //     req.body,
    //     res
    //   );

    //   const member = await authenticateMember(req, res);

    //   const project = await prisma.project.findUnique({
    //     where: {
    //       id: projectID,
    //     },
    //   });
    //   if (!project) {
    //     res.status(400).json({
    //       message: "Project was not found.",
    //     });
    //   }

    //   if (project)
    //     await prisma.project.update({
    //       where: {
    //         id: projectID,
    //       },
    //       data: {
    //         stage: ProjectStage.PendingBountyDesign,
    //       },
    //     });
    //   res.json({ message: "Success" });
    // }
    async (req: ProtectedRequest, res: Response) => {
      return res.status(200).json({ message: "NOT IMPLEMENTED" });
    }
  );
}
