import { app } from "..";

import { type Request, type Response } from "express";
import { CreateBountyPostData, StartBountyPOSTData } from "../sharedTypes";
import prisma from "../prisma";
import { BountyType } from "../../prisma/generated";

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
            stage: body.draft ? "Draft" : "ReadyForTests",
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
}
