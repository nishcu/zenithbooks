import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
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

/**
 * Upload a blog image to Firebase Storage with progress tracking
 * @param file - The image file to upload
 * @param onProgress - Optional progress callback
 * @returns Promise<string> - The download URL of the uploaded image
 */
export async function uploadBlogImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB');
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `blog-${Date.now()}-${uuidv4()}.${fileExtension}`;
    const storageRef = ref(storage, `${BLOG_IMAGES_PATH}${fileName}`);

    // Upload with progress tracking if callback provided
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(new Error('Failed to upload image. Please try again.'));
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Blog image uploaded successfully:', downloadURL);
              resolve(downloadURL);
            } catch (error) {
              console.error('Error getting download URL:', error);
              reject(new Error('Failed to get image URL. Please try again.'));
            }
          }
        );
      });
    } else {
      // Simple upload without progress tracking
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Blog image uploaded successfully:', downloadURL);
      console.log('Storage ref path:', storageRef.fullPath);
      return downloadURL;
    }
  } catch (error) {
    console.error('Error uploading blog image:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload image. Please try again.');
  }
}

/**
 * Delete a blog image from Firebase Storage
 * @param imageUrl - The download URL of the blog image to delete
 */
export async function deleteBlogImage(imageUrl: string): Promise<void> {
  try {
    // Only delete if it's a Firebase Storage URL
    if (!isFirebaseStorageUrl(imageUrl) || !imageUrl.includes(BLOG_IMAGES_PATH)) {
      console.log('Skipping deletion - not a blog image or not from Firebase Storage');
      return;
    }

    const imageRef = ref(storage, getStoragePathFromUrl(imageUrl));
    await deleteObject(imageRef);
    console.log('Blog image deleted successfully');
  } catch (error) {
    console.error('Error deleting blog image:', error);
    // Don't throw error for delete failures as it's not critical
  }
}

/**
 * Validate image file for blog upload
 * @param file - The file to validate
 * @returns Object with validation result and error message if any
 */
export function validateBlogImage(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select a valid image file (JPG, PNG, GIF, WebP)' };
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Image size must be less than 5MB' };
  }

  // Check file size (min 1KB to avoid empty files)
  if (file.size < 1024) {
    return { valid: false, error: 'Image file seems to be corrupted or too small' };
  }

  return { valid: true };
}

/**
 * Check if a URL is from Firebase Storage
 * @param url - The URL to check
 * @returns boolean - true if URL is from Firebase Storage
 */
export function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com');
}

/**
 * Migrate base64 image data URL to Firebase Storage (for existing blog posts)
 * @param base64DataUrl - The base64 data URL to migrate
 * @param fileName - Optional filename for the uploaded image
 * @returns Promise<string> - The Firebase Storage download URL
 */
export async function migrateBase64ToFirebaseStorage(
  base64DataUrl: string,
  fileName?: string
): Promise<string> {
  try {
    // Convert base64 to blob
    const response = await fetch(base64DataUrl);
    const blob = await response.blob();

    // Create a File object from the blob
    const file = new File([blob], fileName || `migrated-${Date.now()}.jpg`, {
      type: blob.type || 'image/jpeg'
    });

    // Upload to Firebase Storage
    return await uploadBlogImage(file);
  } catch (error) {
    console.error('Error migrating base64 image to Firebase Storage:', error);
    throw new Error('Failed to migrate image to Firebase Storage');
  }
}

/**
 * Migrate all blog posts with base64 images to Firebase Storage
 * @param posts - Array of blog posts to migrate
 * @returns Promise<any[]> - Array of migrated blog posts
 */
export async function migrateBlogPostsImages(posts: any[]): Promise<any[]> {
  const migratedPosts = [...posts];

  for (let i = 0; i < migratedPosts.length; i++) {
    const post = migratedPosts[i];

    // Check if imageUrl is a base64 data URL and not already a Firebase Storage URL
    if (post.imageUrl &&
        post.imageUrl.startsWith('data:image/') &&
        !isFirebaseStorageUrl(post.imageUrl)) {

      console.log(`Migrating image for post "${post.title}" (${post.id})`);

      try {
        const firebaseUrl = await migrateBase64ToFirebaseStorage(
          post.imageUrl,
          `blog-${post.id}-migrated-${Date.now()}.jpg`
        );

        // Update the post with the Firebase Storage URL
        migratedPosts[i] = {
          ...post,
          imageUrl: firebaseUrl,
          image: firebaseUrl
        };

        console.log(`Successfully migrated image for post "${post.title}"`);
      } catch (error) {
        console.error(`Failed to migrate image for post "${post.title}":`, error);
        // Keep the original image URL if migration fails
      }
    }
  }

  return migratedPosts;
}
