import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";
import { isAuthenticated } from "../auth";

export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

  app.post("/api/uploads/proxy", isAuthenticated, async (req, res) => {
    try {
      const contentType = req.headers["content-type"] || "application/octet-stream";

      if (!contentType.startsWith("image/")) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      const declaredSize = parseInt(req.headers["content-length"] || "0", 10);
      if (declaredSize > MAX_UPLOAD_BYTES) {
        return res.status(413).json({ error: "File too large (max 10 MB)" });
      }

      const privateDir = objectStorageService.getPrivateObjectDir();
      const objectId = randomUUID();
      const fullPath = `${privateDir}/uploads/${objectId}`;

      const parts = fullPath.startsWith("/") ? fullPath.slice(1).split("/") : fullPath.split("/");
      const bucketName = parts[0];
      const objectName = parts.slice(1).join("/");

      const bucket = objectStorageClient.bucket(bucketName);
      const gcsFile = bucket.file(objectName);

      let receivedBytes = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_UPLOAD_BYTES) {
          return res.status(413).json({ error: "File too large (max 10 MB)" });
        }
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      const magicBytes = buffer.slice(0, 4);
      const isJPEG = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8;
      const isPNG = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
      const isGIF = magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46;
      const isWebP = buffer.length > 11 && magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
      if (!isJPEG && !isPNG && !isGIF && !isWebP) {
        return res.status(400).json({ error: "Invalid image file" });
      }

      await gcsFile.save(buffer, {
        metadata: { contentType },
      });

      const objectPath = `/objects/uploads/${objectId}`;

      res.json({ objectPath });
    } catch (error) {
      console.error("Error in proxy upload:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

  /**
   * Serve public files from object storage.
   *
   * GET /public/:filePath(*)
   *
   * This serves files from the public directory in object storage.
   */
  app.get("/public/:filePath(*)", async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const objectFile = await objectStorageService.searchPublicObject(filePath);
      
      if (!objectFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving public file:", error);
      return res.status(500).json({ error: "Failed to serve file" });
    }
  });
}

