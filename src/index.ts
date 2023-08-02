import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { JsonDB, Config } from "node-json-db";
import { bountiesSetup } from "./api/bounties";
import { membersSetup } from "./api/members";
import { teamsSetup } from "./api/teams";
import { projectsSetup } from "./api/projects";
import seedDatabasePrisma from "./seed";

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
app.get("/seed", async (req: Request, res: Response) => {
  console.log("[i] Starting seed");
  await seedDatabasePrisma();
  console.log("[i] Seeding complete");
  res.send("Database Seeded");
});

app.get("/alive", (req: Request, res: Response) => {
  res.send("Alive!");
});

bountiesSetup();
membersSetup();
teamsSetup();
projectsSetup();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
