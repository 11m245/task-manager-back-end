import express from "express";
import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as bcrypt from "bcrypt";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
export const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("mongo Connected");
app.use(express.json());

app.get("/", function (req, res) {
  res.send("welcome to task manager api");
});

app.listen(PORT, () => console.log("app started in PORT", PORT));

app.post("shop/signup", function (req, res) {});

async function generateHashedPassword(plainPassword) {
  const noOfRounds = 10;
  const salt = await bcrypt.genSalt(noOfRounds);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  return hashedPassword;
}

const hashed = await generateHashedPassword("Password@123");
console.log(hashed);
const compareRes = await bcrypt.compare("Password@123", hashed);
console.log("is matched", compareRes);
