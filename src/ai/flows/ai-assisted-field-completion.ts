'use server';
/**
 * @fileOverview AI-powered field completion for exam data input.
 *
 * - aiAssistedFieldCompletion - A function that suggests possible values for examLevel and category based on examName and conductingBody.
 * - AIFieldCompletionInput - The input type for the aiAssistedFieldCompletion function.
 * - AIFieldCompletionOutput - The return type for the aiAssistedFieldCompletion function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {getExamDetails} from '@/services/exam-details';

const AIFieldCompletionInputSchema = z.object({
  examName: z.string().describe('The name of the exam.'),
  conductingBody: z.string().describe('The body conducting the exam.'),
});
export type AIFieldCompletionInput = z.infer<typeof AIFieldCompletionInputSchema>;

const AIFieldCompletionOutputSchema = z.object({
  examLevel: z.string().describe('The suggested level of the exam.'),
  category: z.string().describe('The suggested category of the exam.'),
});
export type AIFieldCompletionOutput = z.infer<typeof AIFieldCompletionOutputSchema>;

export async function aiAssistedFieldCompletion(
  input: AIFieldCompletionInput
): Promise<AIFieldCompletionOutput> {
  return aiFieldCompletionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiFieldCompletionPrompt',
  input: {
    schema: z.object({
      examName: z.string().describe('The name of the exam.'),
      conductingBody: z.string().describe('The body conducting the exam.'),
      examLevel: z.string().describe('The suggested level of the exam.'),
      category: z.string().describe('The suggested category of the exam.'),
    }),
  },
  output: {
    schema: z.object({
      examLevel: z.string().describe('The suggested level of the exam.'),
      category: z.string().describe('The suggested category of the exam.'),
    }),
  },
  prompt: `Based on the exam name "{{examName}}" and conducting body "{{conductingBody}}", suggest appropriate values for examLevel and category. Return the values as a JSON object.
`,
});

const aiFieldCompletionFlow = ai.defineFlow<
  typeof AIFieldCompletionInputSchema,
  typeof AIFieldCompletionOutputSchema
>(
  {
    name: 'aiFieldCompletionFlow',
    inputSchema: AIFieldCompletionInputSchema,
    outputSchema: AIFieldCompletionOutputSchema,
  },
  async input => {
    // Call service to get exam details (mock implementation for now)
    const examDetails = await getExamDetails(input.examName, input.conductingBody);

    // If the service returns valid data, return it directly.
    if (examDetails?.examLevel && examDetails?.category) {
      return {
        examLevel: examDetails.examLevel,
        category: examDetails.category,
      };
    }

    // Otherwise, call the LLM to provide suggestions.
    const {output} = await prompt({
      ...input,
      examLevel: '',
      category: '',
    });

    return output!;
  }
);
