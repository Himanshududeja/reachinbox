import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getUserByEmail, createUser } from "../models/user.model";

dotenv.config();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const getGoogleAuthUrl = () => {
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "openid",
      "email",
      "profile"
    ],
    prompt: "select_account"
  });
};

export const authenticateGoogleUser = async (code: string) => {
  const { tokens } = await client.getToken(code);

  client.setCredentials(tokens);

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new Error("Google account email not found");
  }

  const email = payload.email;
  const name = payload.name || email.split("@")[0];

  let users = await getUserByEmail(email);

  let user;

  if (users.length) {
    user = users[0];
  } else {
    const userId = await createUser(name, email);
    user = {
      id: userId,
      name,
      email
    };
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "7d"
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
};