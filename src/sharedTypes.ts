// Please do not import stuff into this file. It is shared between the client and server.
// Only edit this file in the client repository, then copy into the server repository to avoid sync issues.

// For POST Requests
export type CreateProfile = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  walletAddress: string;
};
export type BountyMgrSetQuotePrice = {
  quotePrice: number;
  projectID: string;
};

export type BountyMgrDeclineProject = {
  projectID: string;
};

export type CreateTeam = {
  name: string;
  description: string;
  link: string;
  memberAddressesToInvite: string[];
  creatorAddress: string;
};

export type CreateProjectData = {
  title: string;
  description: string;
  email: string;
  phone: string;
};

// END For POST Requests

// Team
export type Team = {
  id: string;
  name: string;
  description: string;
  link: string;
  creatorAddress: string;
  // wallet addresses
  pendingInvites: string[];
  members: string[];
};

//Project
export type Project = {
  id: string;
  title: string;
  description: string;
  email: string;
  phone: string;
  bountyIDs: string[];
  quotePrice: number;
  stage:
    | "WaitingBountyMgrQuote"
    | "WaitingFounderPay"
    | "WaitingBountyDesign"
    | "Declined"
    | "Ready";
};

// Bounties
export type Bounty = {
  id: string;
  title: string;
  description: string;
  postDate: Date;
  projectName: string;
  projectId: string;
  type: "Frontend" | "Backend" | "Fullstack" | "Web3";
  reward: number;
  deadline: Date;
  teamCount: number;
  youJoined: boolean;
  stage: "Active" | "Draft" | "Completed" | "ReadyForTests";
  submissions?: string[];
  aboutProject?: string;
  headerSections?: { [key: string]: string[] };
  founder?: Member;
};

// Members
export type Role = {
  id: string;
  title: RoleType;
};
export type Member = {
  username: string;
  firstName: string;
  lastName: string;
  walletAddress: string;
  email: string;
  bio: string;
  level: string;
  roles: Array<Role>;
  playingRole: Role;
  bountiesWon: number;
  teamsJoined: string[];
  membersInvited: number;
  completedWelcome: boolean;
  pendingTeamInvites: TeamInvite[];
};

export type InviteToTeamPOSTData = {
  fromAddress: string;
  toAddress: string;
  toTeam: string;
};

export type TeamInvite = {
  id: string;
  fromAddress: string;
  fromName: string;
  toTeamId: string;
  toTeamName: string;
};

export const RoleDict: Role[] = [
  { id: "0", title: "Founder" },
  { id: "1", title: "Bounty Hunter" },
  { id: "2", title: "Bounty Manager" },
  { id: "3", title: "Bounty Designer" },
  { id: "4", title: "Bounty Validator" },
];

export type RoleType =
  | "Founder"
  | "Bounty Hunter"
  | "Bounty Manager"
  | "Bounty Designer"
  | "Bounty Validator";

export function GetRole(string: RoleType) {
  return RoleDict.find((role) => role.title == string)!;
}
