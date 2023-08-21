// Only edit this file in the server repository, then copy into the client repository to avoid sync issues.

// For POST Requests

// Member
export type CreateProfilePOSTData = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type ChangeRolePOSTData = {
  role: RoleType;
};

// Bounty
export type CreateBountyData = {
  id: string | undefined;
  title: string;
  description: string;
  aboutProject: string;
  reward: number;
  projectID: string;
  postDate: Date;
  deadline: Date;
  types: BountyType[];
  headerSections: { [x: string]: string[] };
};

export type CreateBountyPostData = {
  bounty: CreateBountyData;
  draft: boolean;
};

export type SetApproveBountyPostData = {
  bountyID: string;
  approve: boolean;
};

export type SubmitDeliverablesPostData = {
  bountyID: string;
  teamID: string;
  videoDemo: string;
  repo: string;
};

export type SelectWinningSubmissionPostData = {
  submissionID: string;
};

export type ApproveDisapproveBountyWinnerPostData = {
  submissionID: string;
  approve: boolean;
};

export type ConfirmRewardPostData = {
  submissionWinnerID: string;
};

export type ApproveTestCasePostData = {
  submissionID: string;
  testCases: TestCase[];
};

export type SetTestCasesPostData = {
  bountyID: string;
  testCases: string[];
};

export type StartBountyPOSTData = {
  address: string;
  forTeam: string;
  bountyID: string;
};

// Projects
export type CreateProjectPOSTData = {
  title: string;
  description: string;
  email: string;
  phone: string;
};

export type BountyMgrSetQuotePricePOSTData = {
  quotePrice: number;
  projectID: string;
};

export type BountyMgrDeclineProjectPOSTData = {
  projectID: string;
};

export type FounderConfirmPayPostData = {
  projectID: string;
};

// Team
export type CreateTeamPOSTData = {
  name: string;
  description: string;
  link: string;
};

export type InviteToTeamPOSTData = {
  toAddress: string;
  toTeam: string;
};
export type JoinTeamPOSTData = {
  toTeamID: string;
};

// END For POST Requests
export enum ProjectStage {
  PendingBountyMgrQuote = "PendingBountyMgrQuote",
  PendingFounderPay = "PendingFounderPay",
  PendingBountyDesign = "PendingBountyDesign",
  PendingBountyValidator = "PendingBountyValidator",
  PendingApproval = "PendingApproval",
  Declined = "Declined",
  Ready = "Ready",
}

export enum BountyType {
  Frontend = "Frontend",
  Backend = "Backend",
  Fullstack = "Fullstack",
  Web3 = "Web3",
}

export enum BountyStage {
  Active = "Active",
  Draft = "Draft",
  PendingApproval = "PendingApproval",
  Completed = "Completed",
}

export enum RoleType {
  Founder = "Founder",
  BountyHunter = "BountyHunter",
  BountyManager = "PendingBountyManager",
  BountyDesigner = "BountyDesigner",
  BountyValidator = "BountyValidator",
}

// Models
export interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  link: string;
  memberIDs: string[];
  creatorAddress: string;
  submissionIDs: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  email: string;
  phone: string;
  bountyIDs: string[];
  quotePrice: number;
  stage: ProjectStage;
  founderWalletAddress: string;
  memberWalletAddress: string;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  postDate: Date;
  types: BountyType[];
  deadline: Date;
  participantsTeamIDs: string[];
  testCases: string[];
  testCaseIDs: string[];
  stage: BountyStage;
  submissionIDs: string[];
  aboutProject?: string;
  headerSections?: any;
  winningSubmissionID: string;
  approvedByFounder: boolean;
  approvedByManager: boolean;
  approvedByValidator: boolean;
  reward: number;
  founderAddress: string;
  projectID: string;
  bountyWinnerID: string[];
}

export interface Submission {
  id: string;
  videoDemo: string;
  repo: string;
  createdAt: Date;
  testCaseIDs: string[];
  bountyID: string;
  teamID: string;
  winningSubmissionID?: string;
  bountyWinnerID?: string;
}

export interface TestCase {
  id: string;
  text: string;
  approved: boolean;
  submissionID?: string;
}

export interface Member {
  username: string;
  firstName: string;
  lastName: string;
  walletAddress: string;
  email: string;
  bio: string;
  level: number;
  roles: RoleType[];
  playingRole: RoleType;
  isFounder: boolean;
  bountiesWon: number;
  teamsJoined: number;
  membersInvited: number;
  teamInviteIDs: string[];
  createdTeamIDs: string[];
  teamIDs: string[];
  bountyWinnerIDs: string[];
}

export interface BountyWinner {
  id: string;
  bounty: Bounty;
  bountyID: string;
  confirmed: boolean;
  submissionID: string;
  member: Member;
  memberAddress: string;
  approvedByFounder: boolean;
  approvedByManager: boolean;
}

export interface TeamInvite {
  id: string;
  fromAddress: string;
  fromName: string;
  toTeamID: string;
  toTeamName: string;
  toMemberAddress: string;
}
