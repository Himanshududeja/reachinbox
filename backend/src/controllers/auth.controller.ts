import { Request, Response } from "express";
import {
  getGoogleAuthUrl,
  authenticateGoogleUser
} from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const googleLogin = async (
  req: Request,
  res: Response
) => {
  const url = getGoogleAuthUrl();

  return res.redirect(url);
};

export const googleCallback = async (
  req: Request,
  res: Response
) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        message: "Google authorization code is missing"
      });
    }

    const result = await authenticateGoogleUser(code);

    res.cookie("auth_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.redirect(
      `${process.env.FRONTEND_URL}?auth=success`
    );
  } catch (error) {
    console.error("Google authentication failed:", error);

    return res.redirect(
      `${process.env.FRONTEND_URL}?auth=error`
    );
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
) => {
  return res.status(200).json({
    user: req.user
  });
};