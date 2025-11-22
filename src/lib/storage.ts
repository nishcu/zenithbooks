import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';

// Storage paths
const BLOG_IMAGES_PATH = 'blog-images/';

/**
 * Upload an image file to Firebase Storage
 * @param file - The image file to upload
 * @param folder - The folder path (optional, defaults to blog-images)
 * @returns Promise<string> - The download URL of the uploaded image
 */
export async function uploadImage(file: File, folder: string = BLOG_IMAGES_PATH): Promise<string> {
  try {
    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storageRef = ref(storage, `${folder}${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The download URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract the path from the download URL
    const url = new URL(imageUrl);
    const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);

    const imageRef = ref(storage, path);
    await deleteObject(imageRef);

    console.log('Image deleted successfully:', path);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error for delete failures as it's not critical
  }
}

/**
 * Check if a URL is from Firebase Storage
 * @param url - The URL to check
 * @returns boolean
 */
export function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com') ||
         url.includes('zenithbooks-1c818.firebasestorage.app');
}

/**
 * Extract Firebase Storage path from download URL
 * @param url - The download URL
 * @returns string - The storage path
 */
export function getStoragePathFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);
  } catch (error) {
    console.error('Error extracting storage path:', error);
    return '';
  }
}
