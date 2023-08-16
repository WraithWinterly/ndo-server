import {
  BountyStage,
  BountyType,
  ProjectStage,
  RoleType,
} from "../prisma/generated";
import prisma from "./prisma";

export default async function seedDatabasePrisma() {
  await prisma.bountyWinner.deleteMany();
  await prisma.teamInvite.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.bounty.deleteMany();
  await prisma.team.deleteMany();
  await prisma.project.deleteMany();
  await prisma.member.deleteMany();
  /*
  // Prisma create for bounty1
  const bounty1 = await prisma.bounty.create({
    data: {
      title: "Front-End Cross-Platform Flutter Application",
      description:
        "Build working and deployable code and final software package for Front-End Cross-Platform application, built using Flutter.",
      postDate: new Date("2021-01-01"),
      types: [BountyType.Frontend],
      deadline: new Date(),
      stage: BountyStage.Active,
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
    },
  });

  // Prisma create for bounty2
  const bounty2 = await prisma.bounty.create({
    data: {
      title: "Emoji Translator",
      description:
        "Do you love emojis? We need someone to develop an emoji translator that can convert text into emojis and vice versa. Let's make communication more fun!",
      postDate: new Date("2023-07-15"),
      types: [BountyType.Web3],
      deadline: new Date("2023-08-31"),
      stage: BountyStage.Draft,
    },
  });

  // Prisma create for bounty3
  const bounty3 = await prisma.bounty.create({
    data: {
      title: "Time-Traveling Website",
      description:
        "Ever wished you could go back in time? We want you to build a website that simulates time travel. Let users experience historical events as if they were there!",
      postDate: new Date("2023-07-14"),
      types: [BountyType.Web3],
      deadline: new Date("2023-12-31"),
      participantsTeamIDs: [],
      stage: "Completed",
    },
  });

  // Prisma create for bounty4
  const bounty4 = await prisma.bounty.create({
    data: {
      title: "AI Stand-up Comedian",
      description:
        "Are you a programming genius with a great sense of humor? We're looking for someone to create an AI stand-up comedian that can crack jokes about coding and technology. Make the nerds laugh!",
      postDate: new Date("2023-07-13"),
      types: [BountyType.Backend],
      deadline: new Date("2024-02-28"),
      participantsTeamIDs: [],
      stage: BountyStage.Active,
    },
  });

  // Prisma create for bounty5
  const bounty5 = await prisma.bounty.create({
    data: {
      title: "Reverse-Engineering Puzzle",
      description:
        "Calling all puzzle enthusiasts and code breakers! We have a mysterious device that needs to be reverse-engineered. Solve the puzzle and unveil its secrets!",
      postDate: new Date("2023-07-12"),
      types: [BountyType.Fullstack],
      deadline: new Date("2023-10-31"),
      participantsTeamIDs: [],
      stage: BountyStage.Active,
    },
  });
  */

  // Prisma create for member1
  const member1 = await prisma.member.create({
    data: {
      username: "Ayden",
      firstName: "Ayden",
      lastName: "Springer",
      email: "aspringer@ravensong.com",
      bio: "",
      bountiesWon: 0,
      completedWelcome: true,
      membersInvited: 0,
      teamsJoined: 0,
      playingRole: RoleType.BountyHunter, // Assuming there's a role with ID "0" for "Founder"
      roles: [
        RoleType.BountyHunter,
        RoleType.Founder,
        RoleType.BountyDesigner,
        RoleType.BountyManager,
        RoleType.BountyValidator,
      ],
      // walletAddress: "FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd",
      walletAddress: "nope",
    },
  });

  // Prisma create for member2
  const member2 = await prisma.member.create({
    data: {
      username: "rocky",
      firstName: "Rocky",
      lastName: "Test",
      email: "test@rocky",
      bio: "lorem20",
      level: 22,
      bountiesWon: 24,
      membersInvited: 12,
      teamsJoined: 0,
      completedWelcome: true,
      walletAddress: "7A5E0B7D-B202-494F-BB66-174FBE55FDD3",
      roles: [RoleType.BountyHunter], // Assuming there are roles with IDs "Bounty Hunter" and "Bounty Validator"
      playingRole: RoleType.BountyHunter, // Assuming there's a role with ID "1"
    },
  });

  // Prisma create for member3
  const member3 = await prisma.member.create({
    data: {
      username: "comp1",
      firstName: "Comp1",
      lastName: "comp1",
      email: "test@comp1",
      bio: "lorem20",
      level: 45,
      bountiesWon: 21,
      membersInvited: 92,
      teamsJoined: 0,
      completedWelcome: true,
      walletAddress: "AB65B816-66A5-4322-A950-453F62C9E86E",
      roles: [RoleType.BountyDesigner, RoleType.BountyHunter], // Assuming there are roles with IDs "Bounty Hunter" (connected twice)
      playingRole: RoleType.BountyHunter, // Assuming there's a role with ID "2"
    },
  });

  // Prisma create for member4
  const member4 = await prisma.member.create({
    data: {
      username: "comp2",
      firstName: "Comp2",
      lastName: "comp2",
      email: "",
      bio: "lorem20",
      level: 59,
      bountiesWon: 20,
      membersInvited: 21,
      teamsJoined: 0,
      completedWelcome: true,
      walletAddress: "F16849F2-8078-4CA0-8A90-2FE84A36E3F1",
      roles: [RoleType.BountyManager, RoleType.BountyHunter], // Assuming there are roles with IDs "Bounty Hunter" and "Bounty Designer"
      playingRole: RoleType.BountyManager, // Assuming there's a role with ID "3"
    },
  });

  // Prisma create for member5
  const member5 = await prisma.member.create({
    data: {
      username: "comp4",
      firstName: "Comp3",
      lastName: "",
      email: "test@comp4",
      bio: "lorem20",
      level: 39,
      bountiesWon: 20,
      membersInvited: 21,
      teamsJoined: 0,
      completedWelcome: true,
      walletAddress: "000",
      roles: [RoleType.BountyHunter], // Assuming there are roles with IDs "Bounty Hunter" (connected twice)
      playingRole: RoleType.BountyHunter, // Assuming there's a role with ID "2"
    },
  });
  // Prisma create for team1
  const team1 = await prisma.team.create({
    data: {
      name: "Team Solsitce",
      description: "lorem20",
      link: "https://aydens.net",

      creator: {
        connect: {
          walletAddress: member1.walletAddress,
        },
      },
      members: {
        connect: [
          {
            walletAddress: member1.walletAddress,
          },
          {
            walletAddress: member2.walletAddress,
          },
          {
            walletAddress: member3.walletAddress,
          },
        ],
      },
    },
  });

  // Prisma create for team2
  const team2 = await prisma.team.create({
    data: {
      name: "Team Compete!!!",
      description: "lorem20",
      link: "https://aydens.net",
      creator: {
        connect: {
          walletAddress: member3.walletAddress,
        },
      },
      members: {
        connect: [
          {
            walletAddress: member3.walletAddress,
          },
        ],
      },
    },
  });
  const team3 = await prisma.team.create({
    data: {
      name: "Team SSSSS",
      description: "lorem20",
      link: "https://aydens.net",

      creator: {
        connect: {
          walletAddress: member1.walletAddress,
        },
      },
      members: {
        connect: [
          {
            walletAddress: member1.walletAddress,
          },
        ],
      },
    },
  });

  /*
  // Prisma create for project1
  const project1 = await prisma.project.create({
    data: {
      id: "D283300B-4B62-4142-9A8F-DB9FD1B4AEEE",
      title: "Avalanche",
      description: "lorem10",
      stage: ProjectStage.PendingBountyMgrQuote,
      email: "test@gmail.com",
      phone: "(207) 444-4444",
      quotePrice: 5_5000,
      bounties: {
        connect: [
          {
            id: bounty1.id,
          },
          {
            id: bounty2.id,
          },
          {
            id: bounty3.id,
          },
        ],
      },
      founder: {
        connect: {
          walletAddress: member1.walletAddress,
        },
      },
    },
  });

  // Prisma create for project2
  const project2 = await prisma.project.create({
    data: {
      title: "Booster",
      description: "lorem10",
      stage: ProjectStage.PendingBountyMgrQuote,
      email: "test@gmail.com",
      phone: "(207) 444-4444",
      quotePrice: 6_000,
      bounties: {
        connect: [
          {
            id: bounty4.id,
          },
        ],
      },
      founder: {
        connect: {
          walletAddress: member1.walletAddress,
        },
      },
    },
  });

  // Prisma create for project3
  const project3 = await prisma.project.create({
    data: {
      title: "Treasure",
      description: "lorem10",
      stage: ProjectStage.PendingBountyMgrQuote,
      email: "test@gmail.com",
      phone: "(207) 444-4444",
      quotePrice: 5_000,
      bounties: {
        connect: [
          {
            id: bounty5.id,
          },
        ],
      },
      founder: {
        connect: {
          walletAddress: member1.walletAddress,
        },
      },
    },
  });
  */
}
