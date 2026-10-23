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
import { getEffectiveClerkId } from "@/lib/auth-utils";

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

    // Upload to AWS S3
    const bucketName = process.env.MY_AWS_BUCKET || "kravy-datastorage";
    const extension = file.name ? file.name.split('.').pop() : 'png';
    const filename = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: file.type || "image/png",
    };

    const parallelUploads3 = new Upload({
      client: s3Client,
      params: uploadParams,
    });

    const uploadResult = await parallelUploads3.done();
    
    // Construct the URL based on bucket and region if Location is not fully returned
    // Typically S3 SDK returns Location, but just in case:
    const secure_url = uploadResult.Location || `https://${bucketName}.s3.${process.env.MY_AWS_REGION || "ap-south-1"}.amazonaws.com/${filename}`;

    console.log("✅ Uploaded image URL (AWS):", secure_url);

    // ✅ Always return { secure_url }
    return NextResponse.json({ secure_url: secure_url });

  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}