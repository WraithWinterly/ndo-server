import {
  dbBounties,
  dbBountyWinners,
  db,
  dbMembers,
  dbProjects,
  dbTeamInvites,
  dbTeams,
  Collections,
} from "./";
import {
  Bounty,
  BountyStage,
  BountyType,
  Member,
  Project,
  ProjectStage,
  RoleType,
  Team,
} from "./sharedTypes";

export const SAMPLE_MEMBERS: Array<Member> = [
  {
    username: "wraithwinterly",
    firstName: "Ayden",
    lastName: "Springer",
    email: "wraithwinterly@gmail.com",
    bio: "NDO Proper Member",
    bountiesWon: 0,
    level: 2,
    membersInvited: 0,
    teamsJoined: 0,
    playingRole: RoleType.BountyHunter,
    roles: [
      RoleType.BountyDesigner,
      RoleType.BountyHunter,
      RoleType.BountyManager,
      RoleType.BountyValidator,
      RoleType.Founder,
    ],
    isFounder: false,
    bountyWinnerIDs: [],
    createdTeamIDs: [],
    teamInviteIDs: [],
    teamIDs: ["3D1DADE6-1493-41CB-84DC-5F53F4860959"],
    walletAddress: "FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd",
  },
  {
    username: "Comp0",
    firstName: "Compers",
    lastName: "Stratus",
    email: "comp@gmail.com",
    bio: "It is me.",
    bountiesWon: 32,
    level: 4,
    membersInvited: 0,
    teamsJoined: 0,
    playingRole: RoleType.BountyHunter,
    roles: [RoleType.BountyHunter],
    isFounder: false,
    bountyWinnerIDs: [],
    createdTeamIDs: [],
    teamInviteIDs: [],
    teamIDs: [],
    walletAddress: "000",
  },
];

export const SAMPLE_BOUNTIES: Bounty[] = [
  {
    id: "4B1DF291-5B97-4C31-8DB9-D7AB4C05458F",
    title: "Front-End Cross-Platform Flutter Application",
    description:
      "Build working and deployable code and final software package for Front-End Cross-Platform application, built using Flutter.",
    postDate: new Date("2021-01-01"),
    projectID: "D283300B-4B62-4142-9A8F-DB9FD1B4AEEE",
    types: [BountyType.Frontend],
    reward: 100,
    deadline: new Date(),
    approvedByFounder: true,
    approvedByManager: true,
    approvedByValidator: true,
    bountyWinnerID: [],
    submissionIDs: [],
    testCases: [],
    participantsTeamIDs: [],
    stage: BountyStage.Active,
    winningSubmissionID: "",

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

    founderAddress: SAMPLE_MEMBERS[0].walletAddress,
  },
];
export const SAMPLE_PROJECTS: Project[] = [
  {
    id: "D283300B-4B62-4142-9A8F-DB9FD1B4AEEE",
    title: "Avalanche",
    description: "lorem10",
    stage: ProjectStage.PendingBountyDesign,
    email: "test@gmail.com",
    phone: "(207) 444-4444",
    quotePrice: 5_5000,
    bountyIDs: ["4B1DF291-5B97-4C31-8DB9-D7AB4C05458F"],
    createdAt: new Date(),
    founderWalletAddress: SAMPLE_MEMBERS[0].walletAddress,
  },
  {
    id: "KSIJ@(SK-4B62-4142-9A8F-DB9FD1B4AEEE",
    title: "Avalanche",
    description: "lorem10",
    stage: ProjectStage.PendingFounderPay,
    email: "test@gmail.com",
    phone: "(207) 444-4444",
    quotePrice: 5_5000,
    bountyIDs: ["4B1DF291-5B97-4C31-8DB9-D7AB4C05458F"],
    createdAt: new Date(),
    founderWalletAddress: SAMPLE_MEMBERS[0].walletAddress,
  },
];

export const SAMPLE_TEAMS: Team[] = [
  {
    id: "3D1DADE6-1493-41CB-84DC-5F53F4860959",
    name: "Team Solsitce",
    description: "lorem20",
    creatorAddress: "FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd",
    link: "https://aydens.net",
    memberIDs: ["FC2E5GnpBUs74FtkBaf7Q36JWhbAtSspyVU2mndst7pd"],
    createdAt: new Date(),
    submissionIDs: [],
  },
];

export default async function seedDatabaseFirestore() {
  // const batchDeletion = db.batch();
  // Object.keys(Collections).forEach((collection) => {
  //   const collectionRef = db.collection(collection);
  //   collectionRef
  //     .get()
  //     .then((querySnapshot) => {
  //       querySnapshot.forEach((doc) => {
  //         batchDeletion.delete(doc.ref);
  //       });
  //     })
  //     .catch((error) => {
  //       console.error(`Error deleting documents from ${collection}:`, error);
  //     });
  // });
  // batchDeletion
  //   .commit()
  //   .then(() => {
  //     console.log(
  //       "All documents in the specified collections deleted successfully."
  //     );
  //   })
  //   .catch((error) => {
  //     console.error("Error committing batch:", error);
  //   });
  // batchDeletion.commit();
  // const batch = db.batch();
  // SAMPLE_MEMBERS.forEach((member) => {
  //   const memberRef = dbMembers.doc(member.walletAddress);
  //   batch.set(memberRef, member);
  // });
  // SAMPLE_BOUNTIES.forEach((bounty) => {
  //   const bountyRef = dbBounties.doc(bounty.id);
  //   batch.set(bountyRef, bounty);
  // });
  // SAMPLE_TEAMS.forEach((team) => {
  //   const teamRef = dbTeams.doc(team.id);
  //   batch.set(teamRef, team);
  // });
  // SAMPLE_PROJECTS.forEach((project) => {
  //   const projectRef = dbProjects.doc(project.id);
  //   batch.set(projectRef, project);
  // });
  // await batch.commit();
}
