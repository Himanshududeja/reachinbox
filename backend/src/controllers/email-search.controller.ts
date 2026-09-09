import { Request, Response } from "express";
import { searchEmails } from "../services/elasticsearch.service";

export const searchEmailController = async (
  req: Request,
  res: Response
) => {
  try {
    const query =
      typeof req.query.q === "string"
        ? req.query.q
        : undefined;

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : undefined;

    const page =
      typeof req.query.page === "string"
        ? Number(req.query.page)
        : 1;

    const limit =
      typeof req.query.limit === "string"
        ? Number(req.query.limit)
        : 20;

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message: "Invalid pagination parameters"
      });
    }

    if (
      status &&
      !["pending", "processing", "sent", "failed"].includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    const result = await searchEmails({
      query,
      status,
      page,
      limit
    });

    return res.json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to search emails"
    });
  }
};