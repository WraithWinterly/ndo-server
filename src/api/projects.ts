import {
  CreateProjectPOSTData,
  BountyMgrSetQuotePricePOSTData,
  BountyMgrDeclineProjectPOSTData,
} from "../sharedTypes";
import { app } from "../";

import { Request, Response } from "express";
import prisma from "../prisma";

export function projectsSetup() {
  app.get("/get-projects", async (req: Request, res: Response) => {
    const data = await prisma.project.findMany();

    return res.send(data);
  });
  app.get(
    "/get-bounties-for-project/:id",
    async (req: Request, res: Response) => {
      if (!req.params.id) {
        return res.send(400).json({
          message: "No ID provided",
        });
      }
      const bounties = await prisma.bounty.findMany({
        where: {
          projectId: req.params.id,
        },
      });

      res.send(bounties);
    }
  );
  app.post("/create-proposal", async (req: Request, res: Response) => {
    const createProjectData: CreateProjectPOSTData = req.body;
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

    await prisma.project.create({
      data: {
        title: createProjectData.title,
        description: createProjectData.description,
        stage: "WaitingBountyMgrQuote",
        email: createProjectData.email,
        phone: createProjectData.phone,
        quotePrice: 0,
      },
    });

    res.sendStatus(200);
  });
  app.post(
    "/bountymgr-set-quote-price",
    async (req: Request, res: Response) => {
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
          stage: "WaitingFounderPay",
        },
      });

      res.sendStatus(200);
    }
  );
  app.post("/bountymgr-decline", async (req: Request, res: Response) => {
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

    res.sendStatus(200);
  });
}
