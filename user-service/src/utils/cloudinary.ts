import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Upload an image to Cloudinary
 * @param base64Image - Base64 encoded image (with or without data:image prefix)
 * @param folder - Cloudinary folder to upload to
 * @param publicId - Optional custom public ID
 */
export async function uploadImage(
  base64Image: string,
  folder: string = 'avatars',
  publicId?: string
): Promise<UploadResult> {
  try {
    // Ensure base64 has proper prefix
    let imageData = base64Image;
    if (!imageData.startsWith('data:')) {
      imageData = `data:image/png;base64,${imageData}`;
    }

    const uploadOptions: any = {
      folder: `verifydev/${folder}`,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { format: 'webp' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
      uploadOptions.overwrite = true;
    }

    const result = await cloudinary.uploader.upload(imageData, uploadOptions);

    logger.info({ publicId: result.public_id, url: result.secure_url }, 'Image uploaded to Cloudinary');

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to upload image to Cloudinary');
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    logger.error({ error, publicId }, 'Failed to delete image from Cloudinary');
    return false;
  }
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export default cloudinary;
