import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { JsonDB, Config } from "node-json-db";
import { bountiesSeed, bountiesSetup } from "./api/bounties";
import { memberSeed, membersSetup } from "./api/members";
import { teamsSeed, teamsSetup } from "./api/teams";
import { projectsSeed, projectsSetup } from "./api/projects";
import { inboxSeed, inboxSetup } from "./api/inbox";

export const db = new JsonDB(new Config("jsonDB", true, false, "/"));

dotenv.config();

export const app: Express = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get("/", (req: Request, res: Response) => {
  res.send("New Dev Order Development Server is running");
});

// NOT needed for actual app, used for testing data
app.get("/seed", async (req: Request, res: Response) => {
  await bountiesSeed();
  await memberSeed();
  await teamsSeed();
  await projectsSeed();
  await inboxSeed();
  console.log("[i] Database Seeded");
  res.status(200).send();
});

// NOT needed for actual app, used for testing data
app.get("/reload", async (req: Request, res: Response) => {
  db.reload();
  console.log("[i] Database Reloaded");
  res.status(200).send();
});

app.get("/alive", (req: Request, res: Response) => {
  res.send("Alive!");
});

bountiesSetup();
membersSetup();
teamsSetup();
projectsSetup();
inboxSetup();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
