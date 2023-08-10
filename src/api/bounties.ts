import { app } from "..";

import { type Request, type Response } from "express";
import {
  SetApproveBountyPostData,
  CreateBountyPostData,
  StartBountyPOSTData,
  SetTestCasesPostData,
  SubmitDeliverablesPostData,
  ApproveTestCasePostData,
  SelectWinningSubmissionPostData,
  ApproveDisapproveBountyWinnerPostData,
} from "../sharedTypes";
import prisma from "../prisma";
import {
  Bounty,
  BountyStage,
  BountyType,
  BountyWinner,
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
        winningSubmission: {
          include: {
            team: true,
          },
        },
        submissions: {
          include: {
            team: true,
          },

          // select: {
          //   // TODO: only allow validator to see this
          //   repo: true,
          // },
        },
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
    const bounty = await prisma.bounty.findUnique({
      where: {
        id: bountyID,
      },
    });
    if (bounty.stage !== BountyStage.Active)
      return res.sendStatus(400).json({ message: "Bounty not active" });
    await prisma.bounty.update({
      where: {
        id: bountyID,
      },
      data: {
        participantsTeamIDs: {
          push: team.id,
        },
      },
    });

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
    const startDate = new Date(body.bounty.postDate);
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

    // Ensure reward amount is valid
    const bounties = await prisma.bounty.findMany({
      where: {
        projectId: body.bounty.projectID,
      },
    });
    let reward = project.quotePrice;
    if (reward <= 0) {
      return res.status(400).json({ message: "Invalid reward amount" });
    }
    const withoutMe = bounties?.filter((b) => b.id !== body.bounty?.id);
    withoutMe?.forEach((bounty) => {
      reward -= bounty.reward;
    });
    if (body.bounty.reward > reward) {
      return res.status(400).json({ message: "Reward amount is too high" });
    }

    if (!body.bounty.id)
      // Create bounty
      await prisma.project.update({
        where: {
          id: body.bounty.projectID,
        },
        data: {
          bounties: {
            create: {
              title: body.bounty.title,
              description: body.bounty.description,
              aboutProject: body.bounty.aboutProject,
              reward: body.bounty.reward,
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
    else {
      await prisma.project.update({
        where: {
          id: body.bounty.projectID,
        },
        data: {
          bounties: {
            update: {
              where: {
                id: body.bounty.id,
              },
              data: {
                title: body.bounty.title,
                description: body.bounty.description,
                aboutProject: body.bounty.aboutProject,
                reward: body.bounty.reward,
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
        },
      });
    }
    // Return success response
    return res.status(200).json({ message: "Bounty created successfully" });
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
          stage: "Active",
        },
      });
      await prisma.project.update({
        where: {
          id: bounty.projectId,
        },
        data: {
          stage: "Ready",
        },
      });
    }
    res.status(200).json({ message: "Success" });
  });
  app.post("/add-test-cases", async (req: Request, res: Response) => {
    const body = req.body as SetTestCasesPostData;
    const { bountyID, walletAddress, testCases } = body;
    if (!bountyID) {
      return res.status(400).json({ message: "bountyID is missing" });
    }
    if (!walletAddress) {
      return res.status(400).json({ message: "walletAddress is missing" });
    }
    if (!testCases || !Array.isArray(testCases)) {
      return res
        .status(400)
        .json({ message: "testCases is missing or invalid" });
    }
    const member = await prisma.member.findUnique({
      where: {
        walletAddress,
      },
    });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }
    if (member.playingRole != RoleType.BountyValidator) {
      return res
        .status(400)
        .json({ message: "You are not allowed to add test cases." });
    }
    const bounty = await prisma.bounty.findUnique({
      where: {
        id: bountyID,
      },
    });
    if (!bounty) {
      return res.status(400).json({ message: "Bounty not found" });
    }
    if (bounty.stage !== BountyStage.Active) {
      return res.status(400).json({ message: "Bounty is not active anymore!" });
    }
    const updatedBounty = await prisma.bounty.update({
      where: {
        id: bountyID,
      },
      data: {
        testCases: testCases,
      },
      include: {
        submissions: true,
      },
    });
    if (!updatedBounty) {
      return res
        .status(400)
        .json({ message: "Something went wrong updating the bounty" });
    }
    await prisma.testCase.deleteMany({
      where: {
        submission: {
          bountyId: bountyID,
        },
      },
    });
    updatedBounty.submissions.forEach(async (submission) => {
      updatedBounty.testCases.forEach(async (testCase) => {
        await prisma.testCase.create({
          data: {
            text: testCase,
            approved: false,
            submission: {
              connect: {
                id: submission.id,
              },
            },
          },
        });
      });
    });
    res.status(200).json({ message: "Success" });
  });
  app.get("/get-submission/:id", async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res.status(400).json({
        message:
          "teamID, bountyId, walletAddress separated by comma is missing",
      });
    }
    const ids = req.params.id.split(",");
    const teamId = ids[0];
    const bountyId = ids[1];
    const walletAddress = ids[2];

    if (!teamId || !bountyId || !walletAddress) {
      return res.status(400).json({
        message:
          "teamID, bountyId, walletAddress separated by comma is missing",
      });
    }

    const submissions = await prisma.submission.findFirst({
      where: {
        teamId,
        AND: {
          team: {
            creatorAddress: walletAddress,
          },
          AND: {
            bountyId,
          },
        },
      },
    });

    res.send(submissions);
  });
  app.post("/submit-deliverables", async (req: Request, res: Response) => {
    const body = req.body as SubmitDeliverablesPostData;
    const { bountyID, teamID, walletAddress, videoDemo, repo } = body;
    if (!bountyID) {
      return res.status(400).json({ message: "bountyID is missing" });
    }
    if (!teamID) {
      return res.status(400).json({ message: "teamID is missing" });
    }
    if (!walletAddress) {
      return res.status(400).json({ message: "walletAddress is missing" });
    }
    if (!videoDemo || !repo) {
      return res
        .status(400)
        .json({ message: "deliverables is missing or invalid" });
    }
    const member = await prisma.member.findUnique({
      where: {
        walletAddress,
      },
    });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }

    // Verify they are creator of the team
    const team = await prisma.team.findUnique({
      where: {
        id: teamID,
      },
    });
    if (!team) {
      return res.status(400).json({ message: "Team not found" });
    }
    if (team.creatorAddress !== walletAddress) {
      return res.status(400).json({
        message: "You are not a authorized to submit deliverables for the team",
      });
    }

    const bounty = await prisma.bounty.findUnique({
      where: {
        id: bountyID,
      },
    });
    if (!bounty) {
      return res.status(400).json({ message: "Bounty not found" });
    }
    if (bounty.stage !== BountyStage.Active) {
      return res.status(400).json({ message: "Bounty is not active anymore!" });
    }
    await prisma.submission.deleteMany({
      where: {
        teamId: teamID,
        AND: {
          bountyId: bountyID,
        },
      },
    });
    const submission = await prisma.submission.create({
      data: {
        repo: repo,
        videoDemo: videoDemo,
        bounty: {
          connect: {
            id: bountyID,
          },
        },
        team: {
          connect: {
            id: teamID,
          },
        },
        testCases: {},
      },
    });
    bounty.testCases.forEach(async (testCase) => {
      await prisma.testCase.create({
        data: {
          text: testCase,
          approved: false,
          submission: {
            connect: {
              id: submission.id,
            },
          },
        },
      });
    });

    res.status(200).json({ message: "Success" });
  });
  app.get("/get-test-cases/:id", async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res.status(400).json({
        message: "submissionId, walletAddress separated by comma is missing",
      });
    }
    const ids = req.params.id.split(",");
    const submissionId = ids[0];
    const walletAddress = ids[1];

    if (!submissionId || !walletAddress) {
      return res.status(400).json({
        message: "id of team, walletAddress separated by comma is missing",
      });
    }
    const member = await prisma.member.findUnique({
      where: {
        walletAddress,
      },
    });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }
    if (
      member.playingRole != RoleType.BountyValidator &&
      member.playingRole != RoleType.BountyManager &&
      member.playingRole != RoleType.Founder
    ) {
      return res
        .status(400)
        .json({ message: "You are not allowed to view test cases." });
    }

    const testCases = await prisma.testCase.findMany({
      where: {
        submission: {
          id: submissionId,
        },
      },
    });

    res.send(testCases);
  });
  app.post("/approve-test-cases", async (req: Request, res: Response) => {
    const body = req.body as ApproveTestCasePostData;

    const { submissionID, walletAddress, testCases } = body;
    if (!submissionID) {
      return res.status(400).json({ message: "submissionID is missing" });
    }
    if (!walletAddress) {
      return res.status(400).json({ message: "walletAddress is missing" });
    }
    if (!testCases || !Array.isArray(testCases)) {
      return res
        .status(400)
        .json({ message: "testCases is missing or invalid" });
    }
    const member = await prisma.member.findUnique({
      where: {
        walletAddress,
      },
    });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }
    if (member.playingRole != RoleType.BountyValidator) {
      return res
        .status(400)
        .json({ message: "You are not allowed to approve test cases." });
    }
    // Ensure these test cases are not bogus, they are actual test cases
    const submission = await prisma.submission.findUnique({
      where: {
        id: submissionID,
      },
      include: {
        bounty: true,
      },
    });

    const validCases = testCases.filter((testCase) =>
      submission.bounty.testCases.includes(testCase.text)
    );

    if (validCases.length != submission.bounty.testCases.length) {
      return res.status(400).json({ message: "Invalid test cases" });
    }

    testCases.forEach(async (testCase) => {
      await prisma.testCase.update({
        where: {
          id: testCase.id,
        },
        data: {
          approved: testCase.approved,
        },
      });
    });
    res.status(200).json({ message: "Success" });
  });
  app.post(
    "/validator-select-winning-submission",
    async (req: Request, res: Response) => {
      const body = req.body as SelectWinningSubmissionPostData;
      const { submissionID, walletAddress } = body;
      if (!submissionID) {
        return res.status(400).json({ message: "submissionID is missing" });
      }
      if (!walletAddress) {
        return res.status(400).json({ message: "walletAddress is missing" });
      }
      const member = await prisma.member.findUnique({
        where: {
          walletAddress,
        },
      });
      if (!member) {
        return res.status(400).json({ message: "Member not found" });
      }
      if (member.playingRole != RoleType.BountyValidator) {
        return res.status(400).json({
          message: "You are not allowed to select the winning submission.",
        });
      }
      const submission = await prisma.submission.findUnique({
        where: {
          id: submissionID,
        },
        include: {
          bounty: true,
          team: true,
        },
      });
      if (!submission) {
        return res.status(400).json({ message: "Submission not found" });
      }
      if (submission.bounty.stage !== BountyStage.Active) {
        return res.status(400).json({ message: "Bounty is not active" });
      }
      if (submission.team.creatorAddress !== walletAddress) {
        return res.status(400).json({
          message: "You are not a authorized to select the winning submission.",
        });
      }
      const winner = await prisma.bountyWinner.findMany({
        where: {
          member: {
            walletAddress: submission.team.creatorAddress,
          },
          bounty: {
            id: submission.bountyId,
          },
        },
      });

      if (winner.length > 0) {
        return res.status(400).json({
          message: "You have already selected the winning submission.",
        });
      }
      await prisma.bountyWinner.create({
        data: {
          member: {
            connect: {
              walletAddress: submission.team.creatorAddress,
            },
          },
          submission: {
            connect: {
              id: submission.id,
            },
          },
          bounty: {
            connect: {
              id: submission.bountyId,
            },
          },
        },
      });
      res.status(200).json({ message: "Success" });
    }
  );
  app.get("/get-winner-by-bounty/:id", async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res.status(400).json({
        message: "bountyID is missing",
      });
    }
    const bountyID = req.params.id;
    const bounty = await prisma.bountyWinner.findUnique({
      where: {
        bountyId: bountyID,
      },
    });

    res.send(bounty);
  });
  app.post(
    "/approve-disapprove-bounty-winner",
    async (req: Request, res: Response) => {
      const body = req.body as ApproveDisapproveBountyWinnerPostData;
      const { submissionID, walletAddress, approve } = body;
      if (!submissionID) {
        return res.status(400).json({ message: "submissionID is missing" });
      }
      if (!walletAddress) {
        return res.status(400).json({ message: "walletAddress is missing" });
      }
      if (typeof approve !== "boolean") {
        return res
          .status(400)
          .json({ message: "approve is missing or invalid" });
      }
      const member = await prisma.member.findUnique({
        where: {
          walletAddress,
        },
      });
      if (!member) {
        return res.status(400).json({ message: "Member not found" });
      }
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
      const submission = await prisma.submission.findUnique({
        where: {
          id: submissionID,
        },
        include: {
          bounty: true,
          team: true,
        },
      });
      if (!submission) {
        return res.status(400).json({ message: "Submission not found" });
      }
      if (submission.bounty.stage !== BountyStage.Active) {
        return res.status(400).json({ message: "Bounty is not active" });
      }
      if (approve === false) {
        await prisma.bountyWinner.delete({
          where: {
            bountyId: submission.bountyId,
          },
        });
      } else {
        let data: BountyWinner | undefined;
        if (member.playingRole === RoleType.Founder) {
          data = await prisma.bountyWinner.update({
            where: {
              bountyId: submission.bountyId,
            },
            data: {
              approvedByFounder: true,
            },
          });
        } else if (member.playingRole === RoleType.BountyManager) {
          data = await prisma.bountyWinner.update({
            where: {
              bountyId: submission.bountyId,
            },
            data: {
              approvedByManager: true,
            },
          });
        }
        if (data.approvedByFounder && data.approvedByManager) {
          // We know its confirmed
          await prisma.bounty.update({
            where: {
              id: submission.bountyId,
            },
            data: {
              stage: BountyStage.Completed,
            },
          });
          await prisma.bountyWinner.update({
            where: {
              id: data.id,
            },
            data: {
              confirmed: true,
            },
          });
          await prisma.bounty.update({
            where: {
              id: data.bountyId,
            },
            data: {
              winningSubmission: {
                connect: {
                  id: submission.id,
                },
              },
            },
          });
        }
      }
      res.status(200).json({ message: "Success" });
    }
  );
}
