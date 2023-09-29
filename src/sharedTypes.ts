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
  startDate: Date;
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
  submissionID: string;
};

export type ApproveTestCasePostData = {
  submissionID: string;
  testCases: TestCase[];
  reason: string;
  type: "approve" | "reject" | "approve-winner";
};

export type SetTestCasesPostData = {
  bountyID: string;
  testCases: string[];
};

export type StartBountyPOSTData = {
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
  toMemberID: string;
  toTeamID: string;
};
export type JoinTeamPOSTData = {
  toTeamID: string;
};

// Officer
export type OfficerConfirmProjectPaidPOSTData = {
  projectID: string;
};

export type OfficerConfirmBountyWinnerPOSTData = {
  submissionID: string;
};

// Notifications
export type RemoveNotificationPOSTData = {
  notificationID: string;
};

// END For POST Requests

export enum NotificationType {
  ToBM_ProposalCreated = "ToBM_ProposalCreated",
  ToFounder_BMQuoted = "ToFounder_BMQuoted",
  ToFounder_BountyMgrDeclined = "ToFounder_BountyMgrDeclined",
  ToBMOfficer_FounderAcceptedQuote = "ToBMOfficer_FounderAcceptedQuote",
  ToBMBDFounder_ReadyForBountyDesign = "ToBMBDFounder_ReadyForBountyDesign",
  ToBMBVFounder_BountyNeedsApproval = "ToBMBVFounder_BountyNeedsApproval",
  ToBMBDBVFounder_BountyApproved = "ToFounder_BountyApproved",
  ToBV_SubmissionSubmitted = "ToBV_SubmissionSubmitted",
  ToBH_SubmissionApproved = "ToBH_SubmissionApproved",
  ToBH_SubmissionRejected = "ToBH_SubmissionRejected",
  ToBMFounder_WinnerSelected = "ToBMFounder_WinnerSelected",
  ToBHBVOfficerFounder_WinnerApproved = "ToBHBVOfficer_WinnerApproved",
  ToBMBVFounder_WinnerRejected = "ToBMBVFounder_WinnerRejected",
}

export type Notification = {
  id: string;
  teamID?: string;
  teamName?: string;
  bountyID?: string;
  bountyName?: string;
  submissionID?: string;
  projectID?: string;
  projectName?: string;
  type: NotificationType;
  createdAt: Date;
};

export enum ProjectStage {
  PendingBountyMgrQuote = "PendingBountyMgrQuote",
  PendingFounderPay = "PendingFounderPay",
  PendingOfficer = "PendingOfficer",
  PendingBountyDesign = "PendingBountyDesign",
  Ready = "Ready",
  Declined = "Declined",
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
  BountyManager = "BountyManager",
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
  creatorID: string;
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
  // 85% of quotePrice
  totalFunds: number;
  stage: ProjectStage;
  founderID: string;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  startDate: Date;
  types: BountyType[];
  deadline: Date;
  participantTeamIDs: string[];
  stage: BountyStage;
  submissionIDs: string[];
  aboutProject?: string;
  headerSections?: any;
  approvedByFounder: boolean;
  approvedByManager: boolean;
  approvedByValidator: boolean;
  reward: number;
  projectID: string;
  winningSubmissionID: string;
}

export enum SubmissionState {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  // We can infer if it is one of these states, it is also approved
  WinnerPendingConfirmation = "WinnerPendingConfirmation",
  WinnerConfirmed = "WinnerConfirmed",
  WinnerAndRewardPendingOfficer = "WinnerAndRewardPendingOfficer",
  WinnerAndRewardDone = "WinnerAndRewardDone",
}
export interface Submission {
  id: string;
  videoDemo: string;
  repo: string;
  createdAt: Date;
  testCases: TestCase[];
  state: SubmissionState;
  reason: string;
  bountyID: string;
  teamID: string;
  isWinnerApprovedByFounder: boolean;
  isWinnerApprovedByManager: boolean;
}

export type TestCase = {
  id: string;
  testCase: string;
  status: "passed" | "failed" | "unsure";
};

export interface Member {
  username: string;
  firstName: string;
  lastName: string;
  id: string;
  email: string;
  bio: string;
  level: number;
  roles: RoleType[];
  playingRole: RoleType;
  isFounder: boolean;
  financialOfficer: boolean;
  bountiesWon: number;
  teamsJoined: number;
  membersInvited: number;
  teamInviteIDs: string[];
  teamIDs: string[];
  admin: boolean;
  adminec: boolean;
  notificationIDs: string[];
}

export interface TeamInvite {
  id: string;
  fromMemberID: string;
  fromMemberName: string;
  toTeamID: string;
  toTeamName: string;
  toMemberID: string;
}
