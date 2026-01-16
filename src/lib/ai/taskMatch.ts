/**
 * AI Task Matching Module
 * Suggests best professionals for each task based on skills and location
 * Optional and isolated module
 */

import type { TaskPost, ProfessionalProfile } from '../professionals/types';
import { listProfessionals } from '../professionals/firestore';

/**
 * Calculate match score between a task and a professional
 */
function calculateMatchScore(
  task: TaskPost,
  professional: ProfessionalProfile
): number {
  let score = 0;

  // Location match (40% weight)
  const taskLocation = task.location.toLowerCase();
  const professionalLocations = professional.locations.map((loc) =>
    loc.toLowerCase()
  );
  const locationMatch = professionalLocations.some((loc) =>
    taskLocation.includes(loc) || loc.includes(taskLocation)
  );
  if (locationMatch) {
    score += 40;
  } else if (task.state && professionalLocations.some((loc) => loc.includes(task.state.toLowerCase()))) {
    score += 20; // Partial match on state
  }

  // Skill match (35% weight)
  const taskCategory = task.category.toLowerCase();
  const professionalSkills = professional.skills.map((skill) =>
    skill.toLowerCase()
  );
  const skillMatch = professionalSkills.some((skill) =>
    taskCategory.includes(skill) || skill.includes(taskCategory)
  );
  if (skillMatch) {
    score += 35;
  }

  // Experience bonus (15% weight)
  if (professional.experience >= 5) {
    score += 15;
  } else if (professional.experience >= 3) {
    score += 10;
  } else if (professional.experience >= 1) {
    score += 5;
  }

  // Rating bonus (10% weight)
  if (professional.rating && professional.rating >= 4.5) {
    score += 10;
  } else if (professional.rating && professional.rating >= 4.0) {
    score += 7;
  } else if (professional.rating && professional.rating >= 3.5) {
    score += 5;
  }

  // Verification bonus (small)
  if (professional.isVerified) {
    score += 5;
  }

  return Math.min(100, score); // Cap at 100
}

/**
 * Get matched professionals for a task
 * Returns professionals sorted by match score (highest first)
 */
export async function getMatchedProfessionals(
  task: TaskPost,
  limitCount: number = 10
): Promise<Array<{ professional: ProfessionalProfile; score: number }>> {
  try {
    // Get all professionals (or filter by location if available)
    const professionals = await listProfessionals({
      state: task.state,
      city: task.city,
      limitCount: 100, // Get more to filter
    });

    // Calculate match scores
    const matches = professionals.map((professional) => ({
      professional,
      score: calculateMatchScore(task, professional),
    }));

    // Sort by score (descending) and filter out very low scores
    const filteredMatches = matches
      .filter((match) => match.score >= 20) // Minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, limitCount);

    return filteredMatches;
  } catch (error) {
    console.error('Error matching professionals:', error);
    return [];
  }
}

/**
 * Get top 3 recommended professionals for a task
 */
export async function getTopRecommendations(
  task: TaskPost
): Promise<Array<{ professional: ProfessionalProfile; score: number }>> {
  return getMatchedProfessionals(task, 3);
}

