import { app } from "..";

import { type Request, type Response } from "express";
import {
  SetApproveBountyPostData,
  CreateBountyPostData,
  StartBountyPOSTData,
  SubmitDraftBountyPostData,
} from "../sharedTypes";
import prisma from "../prisma";
import {
  Bounty,
  BountyStage,
  BountyType,
  RoleType,
} from "../../prisma/generated";

export function bountiesSetup() {
  app.get("/get-bounties", async (req: Request, res: Response) => {
    const data = await prisma.bounty.findMany({
      include: {
        project: true,
      },
    });
    return res.send(data);
  });
  app.get("/get-bounty-by-id/:id", async (req: Request, res: Response) => {
    // Called when a user clicks 'view details' on a bounty. req.params.id is the Bounty ID.

    // If it is not provided, return 400.
    if (!req.params.id) return res.status(400).json({ message: "No ID" });

    // Find the bounty from the database
    const bounty = await prisma.bounty.findUnique({
      where: {
        id: req.params.id as string,
      },
      include: {
        // We need to include the project to show "Project X" on the bounty page or list.
        project: true,
        // We include the founder for the "Meet the Founder" portion on the view bounty page.
        founder: true,
      },
    });

    return res.send(bounty);
  });
  app.post("/start-bounty", async (req: Request, res: Response) => {
    const { address, forTeam, bountyID } = req.body as StartBountyPOSTData;

    if (!address) return res.sendStatus(400).json({ message: "No address" });
    if (!forTeam) return res.sendStatus(400).json({ message: "No team" });
    if (!bountyID) return res.sendStatus(400).json({ message: "No bounty" });

    const team = await prisma.team.findUnique({
      where: {
        id: forTeam,
      },
    });
    if (address != team.creatorAddress)
      return res
        .sendStatus(400)
        .json({ message: "You are not the team owner." });

    const bounty = await prisma.bounty.update({
      where: {
        id: bountyID,
      },
      data: {
        participantsTeamIDs: {
          push: team.id,
        },
      },
    });

    console.log(`success started bounty for team ${team.name}`);
    res.status(200).json({
      message: "Success",
    });
  });
  app.post("/create-bounty", async (req: Request, res: Response) => {
    const body = req.body as CreateBountyPostData;

    // Check if the bounty data and draft boolean are present in the request body
    if (!body.bounty) {
      return res.status(400).json({ message: "Data bounty is missing" });
    }

    // Ensure that draft is a boolean
    if (typeof body.draft !== "boolean") {
      return res.status(400).json({ message: "draft must be a boolean value" });
    }
    if (!body.walletAddress) {
      return res.status(400).json({ message: "walletAddress is missing" });
    }

    // Define the list of required fields for the bounty
    const requiredFields = [
      "title",
      "description",
      "about",
      "amount",
      "types",
      "projectID",
      "startDate",
      "deadline",
      "headerSections",
    ];

    // Check if all required fields are present in the bounty data
    const missingFields = requiredFields.filter(
      (field) => !body.bounty.hasOwnProperty(field)
    );

    // If any required field is missing, return an error response
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Data ${missingFields.join(", ")} is missing in bounty`,
      });
    }

    const member = await prisma.member.findUnique({
      where: {
        walletAddress: body.walletAddress,
      },
    });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }
    // You would ensure member is a bounty designer creating a bounty here

    // Also check the validity of specific fields (e.g., startDate and deadline)
    // Validation for startDate and deadline
    const startDate = new Date(body.bounty.startDate);
    const deadline = new Date(body.bounty.deadline);

    if (startDate > deadline) {
      return res
        .status(400)
        .json({ message: "Deadline must be after the start date" });
    }

    const project = await prisma.project.findUnique({
      where: {
        id: body.bounty.projectID,
      },
      include: {
        founder: true,
      },
    });

    if (!project) {
      return res.status(400).json({ message: "Project not found" });
    }

    await prisma.project.update({
      where: {
        id: body.bounty.projectID,
      },
      data: {
        bounties: {
          create: {
            title: body.bounty.title,
            description: body.bounty.description,
            aboutProject: body.bounty.about,
            reward: body.bounty.amount,
            deadline: body.bounty.deadline,
            headerSections: body.bounty.headerSections,
            postDate: new Date(),
            types: body.bounty.types,
            stage: body.draft ? "Draft" : "PendingApproval",
            founder: {
              connect: {
                walletAddress: project.founder.walletAddress,
              },
            },
          },
        },
      },
    });

    // Return success response
    return res.status(200).json({ message: "Bounty created successfully" });
  });
  app.post("/submit-bounty-draft", async (req: Request, res: Response) => {
    const body = req.body as SubmitDraftBountyPostData;
    const { bountyID, walletAddress } = body;
    const member = await prisma.member.findUnique({
      where: {
        walletAddress,
      },
    });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }
    if (member.playingRole != "BountyDesigner") {
      return res.status(400).json({ message: "You are not a Bounty Designer" });
    }

    const bounty = await prisma.bounty.findUnique({
      where: {
        id: bountyID,
      },
    });
    if (!bounty) {
      return res.status(400).json({ message: "Bounty not found" });
    }

    await prisma.bounty.update({
      where: {
        id: bountyID,
      },
      data: {
        stage: "PendingApproval",
      },
    });
    res.status(200).json({ message: "Success" });
  });
  app.post("/set-bounty-approval", async (req: Request, res: Response) => {
    const body = req.body as SetApproveBountyPostData;
    const { bountyID, walletAddress, approve } = body;
    if (!bountyID) {
      return res.status(400).json({ message: "bountyID is missing" });
    }
    if (!walletAddress) {
      return res.status(400).json({ message: "walletAddress is missing" });
    }
    if (typeof approve !== "boolean") {
      return res.status(400).json({ message: "Approve must be a boolean" });
    }
    const member = await prisma.member.findUnique({
      where: {
        walletAddress,
      },
    });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }
    const allowedApprovedRoles = [
      RoleType.BountyManager,
      RoleType.BountyValidator,
      RoleType.Founder,
    ];
    // @ts-expect-error Allow this type of search with enum
    if (!allowedApprovedRoles.includes(member.playingRole)) {
      return res
        .status(400)
        .json({ message: "You are not allowed to approve this bounty" });
    }
    let updatedBounty: null | Bounty = null;

    const bounty = await prisma.bounty.findUnique({
      where: {
        id: bountyID,
      },
    });

    if (!bounty) {
      return res.status(400).json({ message: "Bounty not found" });
    }

    if (bounty.stage !== BountyStage.PendingApproval) {
      return res
        .status(400)
        .json({ message: "Bounty is not pending approvals anymore!" });
    }

    switch (member.playingRole) {
      case RoleType.Founder:
        updatedBounty = await prisma.bounty.update({
          where: {
            id: bountyID,
          },
          data: {
            approvedByFounder: approve ? true : false,
          },
        });

        break;
      case RoleType.BountyManager:
        updatedBounty = await prisma.bounty.update({
          where: {
            id: bountyID,
          },
          data: {
            approvedByManager: approve ? true : false,
          },
        });
        break;
      case RoleType.BountyValidator:
        updatedBounty = await prisma.bounty.update({
          where: {
            id: bountyID,
          },
          data: {
            approvedByValidator: approve ? true : false,
          },
        });
        break;
    }
    if (!updatedBounty) {
      return res.status(400).json({
        message:
          "Something went wrong with updating the bounty approval status...",
      });
    }
    if (
      updatedBounty.approvedByFounder &&
      updatedBounty.approvedByManager &&
      updatedBounty.approvedByValidator
    ) {
      await prisma.bounty.update({
        where: {
          id: bountyID,
        },
        data: {
          stage: "ReadyForTests",
        },
      });
    }
    res.status(200).json({ message: "Success" });
  });
}
