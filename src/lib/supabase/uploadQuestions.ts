/**
 * Updated upload function for the new questions table structure
 */

import { uploadQuestionImage, createQuestion } from './questions';
import type { QuestionCrop, ExtractedAnswer } from '@/types/papers';
import type { CreateQuestionData } from '@/types/questions';

interface UploadQuestionsParams {
  paperType: string; // 'ESAT', 'TMUA', etc.
  sectionName: string; // 'Maths', 'Physics', etc.
  questionCrops: QuestionCrop[];
  extractedAnswers: ExtractedAnswer[];
  pages: any[]; // Processed PDF pages
  solutions?: { [questionNumber: number]: { type: 'preset_image' | 'ai_generated', content: string } };
}

export async function uploadQuestionsToSupabase({
  paperType,
  sectionName,
  questionCrops,
  extractedAnswers,
  pages,
  solutions = {}
}: UploadQuestionsParams) {
  try {
    console.log(`Starting upload for ${paperType} ${sectionName}...`);
    
    const uploadedQuestions = [];
    
    // Upload each question
    for (let i = 0; i < questionCrops.length; i++) {
      const crop = questionCrops[i];
      const answer = extractedAnswers.find(a => a.questionNumber === crop.questionNumber);
      const page = pages[crop.pageNumber - 1];
      
      if (!answer || !page) {
        console.warn(`Skipping question ${crop.questionNumber} - missing data`);
        continue;
      }
      
      console.log(`Uploading question ${crop.questionNumber}...`);
      
      try {
        // 1. Crop the question image from the PDF page
        const croppedImageBlob = await cropImageFromCanvas(
          page.canvas,
          crop.x,
          crop.y,
          crop.width,
          crop.height
        );
        
        // 2. Upload the cropped image to Supabase Storage
        const questionImageUrl = await uploadQuestionImage(
          croppedImageBlob,
          paperType,
          sectionName,
          crop.questionNumber,
          'question'
        );
        
        // 3. Handle solution (if provided)
        let solutionImageUrl: string | undefined;
        let solutionText: string | undefined;
        let solutionType: 'preset_image' | 'ai_generated' | 'none' = 'none';
        
        const solution = solutions[crop.questionNumber];
        if (solution) {
          if (solution.type === 'preset_image') {
            // Upload solution image
            const solutionBlob = await cropImageFromCanvas(
              page.canvas,
              solution.content, // This would be crop coordinates for solution
              crop.x,
              crop.y + crop.height + 20, // Below the question
              crop.width,
              200 // Solution height
            );
            solutionImageUrl = await uploadQuestionImage(
              solutionBlob,
              paperType,
              sectionName,
              crop.questionNumber,
              'solution'
            );
            solutionType = 'preset_image';
          } else if (solution.type === 'ai_generated') {
            solutionText = solution.content;
            solutionType = 'ai_generated';
          }
        }
        
        // 4. Create the question record
        const questionData: CreateQuestionData = {
          questionNumber: crop.questionNumber,
          paperType,
          sectionName,
          questionImage: questionImageUrl,
          answerLetter: answer.answer,
          solutionImage: solutionImageUrl,
          solutionText: solutionText,
          solutionType
        };
        
        const question = await createQuestion(questionData);
        uploadedQuestions.push(question);
        
        console.log(`✓ Question ${crop.questionNumber} uploaded successfully`);
        
      } catch (error) {
        console.error(`Error uploading question ${crop.questionNumber}:`, error);
        // Continue with other questions
      }
    }
    
    console.log(`✓ Upload complete! ${uploadedQuestions.length} questions uploaded`);
    
    return {
      success: true,
      questionsUploaded: uploadedQuestions.length,
      questions: uploadedQuestions
    };
    
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper function to crop an image from a canvas
 */
async function cropImageFromCanvas(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<File> {
  // Create a new canvas for the cropped image
  const croppedCanvas = document.createElement('canvas');
  const croppedContext = croppedCanvas.getContext('2d');
  
  if (!croppedContext) {
    throw new Error('Could not get canvas context');
  }
  
  croppedCanvas.width = width;
  croppedCanvas.height = height;
  
  // Draw the cropped portion
  croppedContext.drawImage(
    canvas,
    x, y, width, height,  // Source rectangle
    0, 0, width, height   // Destination rectangle
  );
  
  // Convert to blob
  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], `question.png`, { type: 'image/png' }));
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}