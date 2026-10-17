import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY || "",
    secretAccessKey: process.env.MY_AWS_ACCESS_SECRET || "",
  },
});
