import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/db/index.js";
import { patients } from "../src/db/schema.js";
import { fileURLToPath } from "node:url";

type SeedPatient = {
  name: string;
  phone: string;
  missedDate: string;
  status: "pending" | "contacted" | "rebooked";
};

type SeedData = {
  patients: SeedPatient[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadSeedData = async (): Promise<SeedData> => {
  const dataPath = path.join(__dirname, "data.json");
  const raw = await readFile(dataPath, "utf-8");
  return JSON.parse(raw) as SeedData;
};

const seed = async () => {
  const data = await loadSeedData();

  await db.delete(patients);

  if (data.patients.length) {
    await db
      .insert(patients)
      .values(data.patients.map((patient) => ({ ...patient })))
      .onConflictDoNothing({ target: patients.phone });
  }
};

seed()
  .then(() => {
    console.log("Seeding completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding data:", error);
    process.exit(1);
  });
