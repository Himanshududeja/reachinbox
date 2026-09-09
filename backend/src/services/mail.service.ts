import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.ETHEREAL_HOST,
  port: Number(process.env.ETHEREAL_PORT),
  secure: false,
  auth: {
    user: process.env.ETHEREAL_USER,
    pass: process.env.ETHEREAL_PASSWORD
  }
});

export const sendEmail = async (
  recipient: string,
  subject: string,
  body: string,
  sender: string
) => {
  const info = await transporter.sendMail({
    from: sender,
    to: recipient,
    subject,
    text: body
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log("Email sent:", info.messageId);

  if (previewUrl) {
    console.log("Ethereal preview:", previewUrl);
  }

  return info;
};