import { app, db } from "..";

import { type Request, type Response } from "express";
import { type Bounty } from "../sharedTypes";
import { SAMPLE_MEMBERS } from "./members";

export const SAMPLE_BOUNTIES: Bounty[] = [
  {
    id: "4B1DF291-5B97-4C31-8DB9-D7AB4C05458F",
    title: "Front-End Cross-Platform Flutter Application",
    description:
      "Build working and deployable code and final software package for Front-End Cross-Platform application, built using Flutter.",
    postDate: new Date("2021-01-01"),
    projectName: "Project 1",
    projectId: "0",
    type: "Frontend",
    reward: 100,
    deadline: new Date(),
    teamCount: 1,
    youJoined: true,
    stage: "ReadyForTests",

    aboutProject:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tenetur, rerum.",

    headerSections: {
      "Tech Stack": [
        "Flutter: A UI toolkit for building natively compiled applications for mobile, web, and desktop from a single codebase.",
        "https://docs.flutter.dev",
        "Dart: The programming language used by Flutter to build applications.",
        "https://dart.dev/",
        "Vercel: Vercel to deploy the application on Web. You may use a platform of your choice to deploy on web as well.",
        "https://vercel.com/",
        "Github: A web-based platform for version control and collaboration that allows developers to host and review code, manage projects, and build software alongside millions of other developers.",
        "https://github.com/",
      ],

      "Requirements Specifications": [
        "Home Page: User Info - First name... (Input, Required)",
        "Home Page: User Info - Last name... (Input, Required)",
        "Button - CTA (Button Text): Wallet Connect",
        'Result Page - Upon clicking "Wallet Connect" button, show the following, success message, opt-in CTA message.',
      ],

      "Solution Constraints": [
        "Deployable on three platforms",
        "Performance",
        "Passes all test cases on three platforms",
      ],

      "Tools to Use": [
        "use: flutter",
        "use: any IDE",
        "use: Dart, DartPad",
        "use: Best practices and recommendations from Flutter",
      ],

      Deliverables: [
        "Completed Code checked in to the repository with a unique folder name that indicates your contribution. It is the parent folder for all deliverables.",
      ],
    },

    founder: SAMPLE_MEMBERS[0],
  },
  {
    id: "F8B1B2A7-2CF0-4BFF-9171-0D6233525B28",
    title: "Emoji Translator",
    description:
      "Do you love emojis? We need someone to develop an emoji translator that can convert text into emojis and vice versa. Let's make communication more fun!",
    postDate: new Date("2023-07-15"),
    projectName: "Project Emoji",
    projectId: "1",
    type: "Web3",
    reward: 50,
    deadline: new Date("2023-08-31"),
    teamCount: 1,
    youJoined: false,
    stage: "Draft",
  },
  {
    id: "A419DF06-3E6F-4101-909C-ECFC7588D232",
    title: "Time-Traveling Website",
    description:
      "Ever wished you could go back in time? We want you to build a website that simulates time travel. Let users experience historical events as if they were there!",
    postDate: new Date("2023-07-14"),
    projectName: "Project Time Warp",
    projectId: "2",
    type: "Fullstack",
    reward: 200,
    deadline: new Date("2023-12-31"),
    teamCount: 2,
    youJoined: false,
    stage: "Completed",
  },
  {
    id: "DCE0766C-206C-474D-91B8-B6CB88C4E793",
    title: "AI Stand-up Comedian",
    description:
      "Are you a programming genius with a great sense of humor? We're looking for someone to create an AI stand-up comedian that can crack jokes about coding and technology. Make the nerds laugh!",
    postDate: new Date("2023-07-13"),
    projectName: "Project LOLCode",
    projectId: "2",
    type: "Backend",
    reward: 150,
    deadline: new Date("2024-02-28"),
    teamCount: 1,
    youJoined: false,
    stage: "Active",
  },
  {
    id: "CFE5C84A-FA10-4C99-ABD9-D24129965127",
    title: "Reverse-Engineering Puzzle",
    description:
      "Calling all puzzle enthusiasts and code breakers! We have a mysterious device that needs to be reverse-engineered. Solve the puzzle and unveil its secrets!",
    postDate: new Date("2023-07-12"),
    projectName: "Project Enigma",
    projectId: "3",
    type: "Web3",
    reward: 75,
    deadline: new Date("2023-10-31"),
    teamCount: 3,
    youJoined: false,
    stage: "Active",
  },
];

export async function bountiesSeed() {
  await db.push("/bounties", SAMPLE_BOUNTIES, true);
}

export function bountiesSetup() {
  app.get("/get-bounties", async (req: Request, res: Response) => {
    const currBounties = (await db.getObjectDefault("/bounties", undefined)) as
      | Bounty[]
      | undefined;
    // console.log(currBounties);
    res.send(currBounties);
  });
}
