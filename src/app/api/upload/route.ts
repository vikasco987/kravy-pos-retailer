// import { NextResponse } from "next/server";
// import cloudinary from "@/lib/cloudinary";

// export async function POST(req: Request) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }

//     // Convert file to buffer
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     // Upload to Cloudinary
//     const uploadResult: any = await new Promise((resolve, reject) => {
//       const stream = cloudinary.uploader.upload_stream(
//         {
//           folder: "uploads",       // optional folder
//           upload_preset: "mybillingmenu", // unsigned preset
//         },
//         (error, result) => {
//           if (error) reject(error);
//           else resolve(result);
//         }
//       );
//       stream.end(buffer);
//     });

//     // Only return the URL
//     return NextResponse.json({ url: uploadResult.secure_url });
//   } catch (err: any) {
//     console.error("Upload error:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }







// import { NextResponse } from "next/server";
// import cloudinary from "@/lib/cloudinary";

// export async function POST(req: Request) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }

//     // Convert file to buffer
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     // Upload to Cloudinary
//     const uploadResult: any = await new Promise((resolve, reject) => {
//       const stream = cloudinary.uploader.upload_stream(
//         {
//           folder: "uploads",             // optional folder
//           upload_preset: "mybillingmenu" // unsigned preset
//         },
//         (error, result) => {
//           if (error) return reject(error);
//           if (!result?.secure_url) return reject(new Error("No secure_url returned"));
//           return resolve(result);
//         }
//       );
//       stream.end(buffer);
//     });

//     // ✅ Always return { secure_url }
//     return NextResponse.json({ secure_url: uploadResult.secure_url });

//   } catch (err: any) {
//     console.error("Upload error:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }












import { NextResponse } from "next/server";
import { s3Client } from "@/lib/aws-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client, GetBucketLocationCommand } from "@aws-sdk/client-s3";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import cloudinary from "cloudinary";

// Cache detected bucket region in-memory
let cachedBucketRegion: string | null = null;

async function getActualBucketRegion(bucketName: string): Promise<string> {
  if (cachedBucketRegion) return cachedBucketRegion;
  if (process.env.MY_AWS_REGION) {
    return process.env.MY_AWS_REGION;
  }

  try {
    // S3 GetBucketLocation requires us-east-1 or default endpoint
    const probeClient = new S3Client({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.MY_AWS_ACCESS_SECRET || process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    const locationResp = await probeClient.send(new GetBucketLocationCommand({ Bucket: bucketName }));
    const loc = locationResp.LocationConstraint;
    // AWS returns null, empty string, or "EU" for specific regions
    const region = !loc ? "us-east-1" : loc === "EU" ? "eu-west-1" : loc;
    cachedBucketRegion = region;
    console.log(`[AWS S3] Auto-detected bucket region for '${bucketName}':`, region);
    return region;
  } catch (err: any) {
    console.warn("[AWS S3] Failed to auto-detect bucket region:", err.message);
    return process.env.MY_AWS_REGION || "us-east-1";
  }
}

async function uploadToCloudinaryFallback(buffer: Buffer): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.v2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const uploadResult = await new Promise<any>((resolve, reject) => {
    cloudinary.v2.uploader.upload_stream(
      { folder: "kravy-uploads" },
      (err, res) => {
        if (err) reject(err);
        else resolve(res);
      }
    ).end(buffer);
  });

  return uploadResult?.secure_url || null;
}

export async function POST(req: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucketName = process.env.MY_AWS_BUCKET || process.env.AWS_S3_BACKUP_BUCKET || "kravy-datastorage";
    const extension = file.name ? file.name.split('.').pop() : 'png';
    const filename = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    // 1. Try Uploading to S3
    try {
      const detectedRegion = await getActualBucketRegion(bucketName);
      
      const clientToUse = (detectedRegion && detectedRegion !== "ap-south-1")
        ? new S3Client({
            region: detectedRegion,
            credentials: {
              accessKeyId: process.env.MY_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
              secretAccessKey: process.env.MY_AWS_ACCESS_SECRET || process.env.AWS_SECRET_ACCESS_KEY || "",
            },
          })
        : s3Client;

      const uploadParams = {
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: file.type || "image/png",
      };

      const parallelUploads3 = new Upload({
        client: clientToUse,
        params: uploadParams,
      });

      const uploadResult = await parallelUploads3.done();
      const secure_url = uploadResult.Location || `https://${bucketName}.s3.${detectedRegion || "us-east-1"}.amazonaws.com/${filename}`;

      console.log("✅ Uploaded image URL (AWS S3):", secure_url);
      return NextResponse.json({ secure_url: secure_url, url: secure_url });
    } catch (s3Err: any) {
      console.warn("⚠️ AWS S3 Upload failed, attempting Cloudinary fallback...", s3Err.message);

      // 2. Cloudinary Fallback if S3 fails (e.g. region mismatch or credentials issue)
      try {
        const cloudinaryUrl = await uploadToCloudinaryFallback(buffer);
        if (cloudinaryUrl) {
          console.log("✅ Uploaded image URL via Cloudinary fallback:", cloudinaryUrl);
          return NextResponse.json({ secure_url: cloudinaryUrl, url: cloudinaryUrl });
        }
      } catch (cloudErr: any) {
        console.error("Cloudinary fallback error:", cloudErr);
      }

      // Re-throw S3 error if fallback also didn't succeed
      throw s3Err;
    }

  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}