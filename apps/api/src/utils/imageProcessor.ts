/**
 * Image processing utility for review images
 * Uses sharp library for resizing, format conversion, and compression
 */
import sharp from 'sharp';
import { randomBytes } from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';

export type ImageFormat = 'webp' | 'avif' | 'jpg' | 'png';

export interface ProcessedImage {
  buffer: Buffer;
  filename: string;
  format: ImageFormat;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  targetFormat?: ImageFormat;
  quality?: number;
  targetSizeKb?: number;
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  targetFormat: 'webp',
  quality: 85,
  targetSizeKb: 80,
};

/**
 * Generate a random filename with UUID
 * @param extension File extension
 * @returns Filename
 */
export function generateFilename(extension: string): string {
  const uuid = randomBytes(16).toString('hex');
  const timestamp = Date.now().toString(36);
  return `${timestamp}-${uuid}.${extension}`;
}

/**
 * Validate image file
 * @param buffer Image buffer
 * @param originalFilename Original filename
 * @returns true if valid, throws error otherwise
 */
async function validateImage(buffer: Buffer, _originalFilename: string): Promise<boolean> {
  // Check buffer size (max 512KB before processing)
  if (buffer.length > 512 * 1024) {
    throw new Error('Image file size too large. Maximum 512KB.');
  }

  // Try to read image metadata to validate it's a valid image
  try {
    const metadata = await sharp(buffer).metadata();

    // Validate format
    const allowedFormats = ['webp', 'avif', 'jpeg', 'jpg', 'png'];
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      throw new Error('Invalid image format. Only WebP, AVIF, PNG, and JPEG allowed.');
    }

    return true;
  } catch (error) {
    throw new Error('Invalid image file. Unable to process.');
  }
}

/**
 * Process image: resize, convert format, and compress
 * @param buffer Input image buffer
 * @param originalFilename Original filename
 * @param options Processing options
 * @returns Processed image data
 */
export async function processImage(
  buffer: Buffer,
  originalFilename: string,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  // Validate image
  await validateImage(buffer, originalFilename);

  // Merge with default options
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Load image
  let image = sharp(buffer);

  // Get original metadata
  const metadata = await image.metadata();

  // Resize if exceeds max dimensions
  if (
    (metadata.width && metadata.width > opts.maxWidth) ||
    (metadata.height && metadata.height > opts.maxHeight)
  ) {
    image = image.resize(opts.maxWidth, opts.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Convert to target format and compress
  let processed: Buffer;
  let finalQuality = opts.quality;

  if (opts.targetFormat === 'webp') {
    processed = await image.webp({ quality: finalQuality }).toBuffer();
  } else if (opts.targetFormat === 'avif') {
    processed = await image.avif({ quality: finalQuality }).toBuffer();
  } else if (opts.targetFormat === 'jpg') {
    processed = await image.jpeg({ quality: finalQuality }).toBuffer();
  } else if (opts.targetFormat === 'png') {
    processed = await image.png({ quality: finalQuality }).toBuffer();
  } else {
    throw new Error(`Unsupported format: ${opts.targetFormat}`);
  }

  // If still too large, reduce quality iteratively
  const targetSizeBytes = opts.targetSizeKb * 1024;
  let attempts = 0;
  const maxAttempts = 5;

  while (processed.length > targetSizeBytes && attempts < maxAttempts) {
    finalQuality = Math.max(50, finalQuality - 10); // Reduce quality but not below 50

    if (opts.targetFormat === 'webp') {
      processed = await sharp(buffer)
        .resize(opts.maxWidth, opts.maxHeight, { fit: 'inside' })
        .webp({ quality: finalQuality })
        .toBuffer();
    } else if (opts.targetFormat === 'avif') {
      processed = await sharp(buffer)
        .resize(opts.maxWidth, opts.maxHeight, { fit: 'inside' })
        .avif({ quality: finalQuality })
        .toBuffer();
    } else if (opts.targetFormat === 'jpg') {
      processed = await sharp(buffer)
        .resize(opts.maxWidth, opts.maxHeight, { fit: 'inside' })
        .jpeg({ quality: finalQuality })
        .toBuffer();
    }

    attempts++;
  }

  // Get final metadata
  const processedMetadata = await sharp(processed).metadata();

  // Generate filename
  const filename = generateFilename(opts.targetFormat);

  return {
    buffer: processed,
    filename,
    format: opts.targetFormat,
    width: processedMetadata.width || 0,
    height: processedMetadata.height || 0,
    sizeBytes: processed.length,
  };
}

/**
 * Save image to local filesystem
 * @param processedImage Processed image data
 * @param baseDir Base directory for uploads
 * @returns File path and URL
 */
export async function saveImageToLocal(
  processedImage: ProcessedImage,
  baseDir: string = '/uploads/reviews'
): Promise<{ filePath: string; url: string }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Create directory structure: /uploads/reviews/YYYY/MM/
  const uploadDir = path.join(baseDir, String(year), month);
  await fs.mkdir(uploadDir, { recursive: true });

  // Save file
  const filePath = path.join(uploadDir, processedImage.filename);
  await fs.writeFile(filePath, processedImage.buffer);

  // Generate URL (relative path for serving via nginx or express.static)
  const url = `/uploads/reviews/${year}/${month}/${processedImage.filename}`;

  return { filePath, url };
}

/**
 * Delete image from local filesystem
 * @param filePath File path
 */
export async function deleteImageFromLocal(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Validate image dimensions and format from buffer
 * @param buffer Image buffer
 * @returns Image metadata
 */
export async function getImageMetadata(buffer: Buffer) {
  return sharp(buffer).metadata();
}
