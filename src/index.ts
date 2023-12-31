import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { bountiesSetup } from "./api/bounties";
import { membersSetup } from "./api/members";
import { teamsSetup } from "./api/teams";
import { projectsSetup } from "./api/projects";
import { officerSetup } from "./api/officer";

import bs58 from "bs58";
import nacl from "tweetnacl";
import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import admin, { firestore } from "firebase-admin";
import serviceAccount from "../service-key.json";

import { generateAccessToken } from "./utils";
import { Bounty, Member, Notification, NotificationType } from "./sharedTypes";
import { notificationSetup } from "./api/inbox";

let refreshTokens = [];

type Nonce = {
  walletAddress: string;
  uuid: string;
};
let nonces: Array<Nonce> = [];

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  projectId: "developmentall",
});
export const db = admin.firestore();

export enum Collections {
  Members = "ndo-members",
  Bounties = "ndo-bounties",
  Teams = "ndo-teams",
  Projects = "ndo-projects",
  TeamInvites = "ndo-team-invites",
  Submissions = "ndo-submissions",
  TestCases = "ndo-test-cases",
  Notifications = "ndo-notifications",
}

export const dbMembers = db.collection(Collections.Members);
export const dbBounties = db.collection(Collections.Bounties);
export const dbTeams = db.collection(Collections.Teams);
export const dbProjects = db.collection(Collections.Projects);
export const dbTeamInvites = db.collection(Collections.TeamInvites);
export const dbSubmissions = db.collection(Collections.Submissions);
export const dbNotifications = db.collection(Collections.Notifications);

export const app: Express = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

async function onRun() {
  // dbNotifications.get().then((snapshot) => {
  //   snapshot.docs.forEach((doc) => {
  //     const notification = doc.data() as Notification;
  //     dbNotifications.doc(notification.id).update({
  //       createdAt: new Date(),
  //     });
  //   });
  // });
}

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "New Dev Order Server is running" });
});

app.post("/request-nonce", (req: Request, res: Response) => {
  const walletAddress = req.body.walletAddress;
  if (!walletAddress) {
    return res
      .status(400)
      .json({ message: "walletAddress is a required field." });
  }
  const id = uuid();
  if (nonces.filter((n) => n.walletAddress === walletAddress).length > 0) {
    // remove all auth uuids
    nonces = nonces.filter((n) => n.walletAddress !== walletAddress);
  }
  nonces.push({ walletAddress, uuid: id });
  return res.status(200).json({ nonce: id });
});

app.post("/authorize", (req: Request, res: Response) => {
  const walletAddress: string = req.body.walletAddress;
  const signedMessage: Uint8Array = new Uint8Array(req.body.signedMessage);
  if (!walletAddress || !signedMessage) {
    return res
      .status(400)
      .json({ error: "walletAddress and signedMessage are required fields." });
  }

  const nonce = nonces.find((n) => n.walletAddress === walletAddress);

  if (!nonce) {
    return res
      .status(401)
      .json({ message: "You haven't requested a nonce yet." });
  }
  // Remove nonce
  nonces = nonces.filter((n) => n.walletAddress !== nonce.walletAddress);

  const publicKeyBytes = bs58.decode(walletAddress.toString());
  // Verify the signature
  const message = `Signing this message will prove your identity. Nonce: ${nonce.uuid}`;
  const messageBuffer = new Uint8Array(
    message.split("").map((c) => c.charCodeAt(0))
  );
  const verified = nacl.sign.detached.verify(
    messageBuffer,
    signedMessage,
    publicKeyBytes
  );

  if (verified) {
    // Provide Json web token
    const accessToken = generateAccessToken(walletAddress);
    const refreshToken = jwt.sign(
      walletAddress,
      process.env.REFRESH_TOKEN_SECRET
    );
    refreshTokens.push(refreshToken);
    return res.json({ accessToken: accessToken, refreshToken: refreshToken });
  } else {
    return res.status(401).json({ message: "unauthorized" });
  }
});

bountiesSetup();
membersSetup();
teamsSetup();
projectsSetup();
officerSetup();
notificationSetup();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  onRun();
});
