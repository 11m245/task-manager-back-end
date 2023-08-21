import nodemailer from "nodemailer";
import nodeSchedule from "node-schedule";
import {
  deleteOlderSentMails,
  getUnSentMails,
  updateMailStatus,
} from "../services/mail.services.js";

// const rule = new schedule.RecurrenceRule();
// rule.hour = 22;
// rule.minute = 5;
// rule.tz = "Asia/Calcutta";

// const job = schedule.scheduleJob(rule, async function reSendMailsAt9PM() {
//   console.log("A scheduled job!");
//   const unSentMails = await getUnSentMails();

//   unSentMails.forEach((mailData) => reSendMail(mailData));
// });

export function reSendMailsAt(hour, min) {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = hour;
  rule.minute = min;
  rule.tz = "Asia/Calcutta";

  const job = nodeSchedule.scheduleJob(rule, async function () {
    try {
      //   console.log("A scheduled job!", new Date().toDateString());
      const unSentMails = await getUnSentMails();
      //   console.log("unsent mails are", unSentMails);
      unSentMails.forEach((mailData) => reSendMail(mailData));
    } catch (err) {
      console.log("schedule error", err);
    }
  });
}

export function reSendMailsAtEvery(min) {
  // const rule = new nodeSchedule.RecurrenceRule();
  // rule.hour = hour;
  // rule.minute = min;
  // rule.tz = "Asia/Calcutta";

  const job = nodeSchedule.scheduleJob(`*/${min} * * * *`, async function () {
    try {
      //   console.log("A scheduled job!", new Date().toDateString());
      const unSentMails = await getUnSentMails();
      //   console.log("unsent mails are", unSentMails);
      unSentMails.forEach((mailData) => reSendMail(mailData));
    } catch (err) {
      console.log("schedule error", err);
    }
  });
}

export async function reSendMail(mailOptions) {
  // console.log("mailer Options", mailOptions);
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

  transporter.verify(function (error, success) {
    if (error) {
      console.log("transporter ERROR in resend", error);
    } else {
      // console.log(
      //   "Server is ready to take our Resending messages : TRANSPORTER VERIFY SUCCESS"
      // );
    }
  });
  // console.log("RE SENDING to", mailOptions.to);
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(
        `ERROR IN RE SENDING MAIL, To: ${mailOptions.to} error OBJ is`,
        error
      );
    } else {
      // console.log(`Email Resent, To: ${mailOptions.to} info OBJ is`, info);
      updateMailStatus(mailOptions._id, true);
      //if mail sent update the status in mail db
    }
  });
}

export function deleteOlderSentMailsAt(hour, min) {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = hour;
  rule.minute = min;
  rule.tz = "Asia/Calcutta";
  const job = nodeSchedule.scheduleJob(rule, async function () {
    try {
      //   console.log("A scheduled job!", new Date().toDateString());
      await deleteOlderSentMails();
    } catch (err) {
      console.log("delete older mails schedule error", err);
    }
  });
}
