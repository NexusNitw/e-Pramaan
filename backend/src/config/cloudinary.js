import { v2 as cloudinary } from 'cloudinary';
import config from './env.js';

// Configure Cloudinary instance
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

/**
 * Upload a file buffer directly to Cloudinary using an upload stream.
 *
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Upload options (folder, resource_type, public_id, etc.)
 * @returns {Promise<Object>} Resolves with Cloudinary upload result
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // If credentials are not configured yet, notify with clear setup instruction
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      return reject(
        new Error(
          'Cloudinary is not configured. Please define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
        )
      );
    }

    const defaultOptions = {
      folder: 'aicte-epranam/dossiers',
      resource_type: 'auto',
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary by public ID.
 *
 * @param {string} publicId - The Cloudinary public ID
 * @param {string} resourceType - 'image' or 'raw'
 * @returns {Promise<Object>}
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export default cloudinary;
