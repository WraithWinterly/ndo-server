import {
  CreateProjectPOSTData,
  BountyMgrSetQuotePricePOSTData,
  BountyMgrDeclineProjectPOSTData,
  FounderConfirmPayPostData,
} from "../sharedTypes";
import { app } from "../";

import { Request, Response } from "express";
import prisma from "../prisma";
import { ProjectStage } from "../../prisma/generated";
import {
  ProtectedRequest,
  authenticateToken,
  authenticateMember,
} from "../utils";

export function projectsSetup() {
  app.get(
    "/get-projects",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const data = (await prisma.project.findMany())?.reverse();

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

      const data = await prisma.project.findUnique({
        where: {
          id: req.params.id,
        },
        include: {
          founder: true,
        },
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
      const bounties = await prisma.bounty.findMany({
        where: {
          projectId: req.params.id,
        },
        include: {
          project: true,
        },
      });

      res.send(bounties);
    }
  );
  app.post(
    "/create-proposal",
    authenticateToken,
    async (req: ProtectedRequest, res: Response) => {
      const createProjectData: CreateProjectPOSTData = req.body;
      const member = await authenticateMember(req, res);
      function canProceedCreateProject() {
        if (!createProjectData) return false;
        if (createProjectData.title.trim().length < 3) return false;
        if (createProjectData.description.trim().length < 3) return false;
        if (createProjectData.email.trim().length < 3) return false;
        let emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
        if (!emailReg.test(createProjectData.email)) return false;
        if (createProjectData.phone.trim().length < 10) return false;

        return true;
      }
      if (!canProceedCreateProject())
        return res.status(400).json({ message: "Invalid data" });
      const founder = await prisma.member.findUnique({
        where: {
          walletAddress: member.walletAddress,
        },
      });
      await prisma.project.create({
        data: {
          title: createProjectData.title,
          description: createProjectData.description,
          stage: ProjectStage.PendingBountyMgrQuote,
          email: createProjectData.email,
          phone: createProjectData.phone,
          quotePrice: 0,
          founder: {
            connect: {
              walletAddress: founder.walletAddress,
            },
          },
        },
      });

      res.json({
        message: "Success",
      });
    }
  );
  app.post(
    "/bountymgr-set-quote-price",
    async (req: ProtectedRequest, res: Response) => {
      const body = req.body as BountyMgrSetQuotePricePOSTData;
      if (!body.projectID || !body.quotePrice) {
        return res.sendStatus(400);
      }
      await prisma.project.update({
        where: {
          id: body.projectID,
        },
        data: {
          quotePrice: body.quotePrice,
          stage: ProjectStage.PendingFounderPay,
        },
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
      const body = req.body as BountyMgrDeclineProjectPOSTData;
      if (!body) {
        return res.sendStatus(400);
      }
      const proj = await prisma.project.update({
        where: {
          id: body.projectID,
        },
        data: {
          stage: "Declined",
          quotePrice: 0,
        },
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
      const body = req.body as FounderConfirmPayPostData;
      if (!body) {
        return res.sendStatus(400);
      }
      const member = await authenticateMember(req, res);

      const project = await prisma.project.findUnique({
        where: {
          id: body.projectID,
        },
      });
      if (!project) {
        res.status(400).json({
          message: "Project was not found.",
        });
      }

      if (project)
        await prisma.project.update({
          where: {
            id: body.projectID,
          },
          data: {
            stage: ProjectStage.PendingBountyDesign,
          },
        });
      res.json({ message: "Success" });
    }
  );
}
