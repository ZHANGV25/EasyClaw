import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createGunzip, createGzip } from 'zlib';
import { Extract } from 'unzipper';
import archiver from 'archiver';

export class S3Manager {
  private client: S3Client;
  private bucket: string;

  constructor(region: string, bucket: string) {
    this.client = new S3Client({ region });
    this.bucket = bucket;
  }

  async downloadAndUnzip(s3Key: string, targetPath: string): Promise<void> {
    console.log(`[S3] Downloading ${s3Key} to ${targetPath}`);

    // Ensure target directory exists
    await mkdir(targetPath, { recursive: true });

    // Download from S3
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`No body in S3 response for key: ${s3Key}`);
    }

    // Stream and unzip
    const body = response.Body as Readable;
    await pipeline(
      body,
      Extract({ path: targetPath })
    );

    console.log(`[S3] Downloaded and extracted to ${targetPath}`);
  }

  async zipAndUpload(sourcePath: string, s3Key: string): Promise<void> {
    console.log(`[S3] Zipping ${sourcePath} and uploading to ${s3Key}`);

    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);

      archive.directory(sourcePath, false);
      archive.finalize();
    });

    const zipBuffer = Buffer.concat(chunks);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: zipBuffer,
      ContentType: 'application/zip',
    });

    await this.client.send(command);

    console.log(`[S3] Uploaded ${zipBuffer.length} bytes to ${s3Key}`);
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
  }

  async cleanup(path: string): Promise<void> {
    try {
      await rm(path, { recursive: true, force: true });
      console.log(`[S3] Cleaned up ${path}`);
    } catch (error) {
      console.error(`[S3] Failed to cleanup ${path}:`, error);
    }
  }
}
