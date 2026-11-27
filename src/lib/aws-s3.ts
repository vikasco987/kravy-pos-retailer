import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION || process.env.AWS_REGION || "ap-south-1",
  followRegionRedirects: true,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.MY_AWS_ACCESS_SECRET || process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

