import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config();

const elasticsearch = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME!,
    password: process.env.ELASTICSEARCH_PASSWORD!
  },
  sniffOnStart: false,
  sniffOnConnectionFault: false,
  sniffInterval: false
});

export default elasticsearch;