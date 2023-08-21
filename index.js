import express from "express";
import { MongoClient } from "mongodb";
import shopRouter from "./routes/shop.routes.js";
import taskRouter from "./routes/task.routes.js";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";
import cors from "cors";
import * as bcrypt from "bcrypt";
import { addMailInDB, updateMailStatus } from "./services/mail.services.js";
import {
  deleteOlderSentMailsAt,
  reSendMailsAtEvery,
} from "./routes/mail.routes.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
export const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("mongo Connected");
app.use(express.json());
app.use(cors());

app.get("/", function (req, res) {
  res.send("welcome to task manager api");
});

app.listen(PORT, () => console.log("app started in PORT", PORT));

app.use("/shop", shopRouter);
app.use("/task", taskRouter);

export async function sendMail(mailerData) {
  const { subject, sender, receivers, textContent, htmlContent } = mailerData;
  // console.log("mailer Data", mailerData);
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail", //intead port use service gmail
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL, //  gmail finance id
      pass: process.env.PASS, // generated gmail app password
    },
  });
  // send mail with defined transporter object
  //   const url = `${process.env.CLIENT_URL}/activate/${activationtoken}`;
  const mailOptions = {
    from: `${sender.name} <${sender.mailId}>`, // sender address
    to: receivers.join(","), // list of receivers
    subject: subject, // Subject line
    text: textContent, // plain text body
    html: htmlContent, // html body
  };

  //SAVE MAIL IN DB
  const addMailRes = await addMailInDB({
    ...mailOptions,
    isSent: false,
    initiatedAt: Date.now(),
    completedAt: "",
  });

  // console.log("addmail Response is", addMailRes);
  transporter.verify(function (error, success) {
    if (error) {
      console.log("transporter ERROR", error);
    } else {
      // console.log(
      //   "Server is ready to take our messages : TRANSPORTER VERIFY SUCCESS"
      // );
    }
  });
  // console.log("SENDING to", mailOptions.to);
  transporter.sendMail(mailOptions, async function (error, info) {
    if (error) {
      console.log(
        `ERROR IN SENDING MAIL, To: ${mailOptions.to} error OBJ is`,
        error
      );
    } else {
      // console.log(`Email sent, To: ${mailOptions.to} info OBJ is`, info);
      // console.log("update mail status", addMailRes);
      await updateMailStatus(addMailRes.insertedId, true);
    }
  });
}

reSendMailsAtEvery(30);
deleteOlderSentMailsAt(7, 0);
