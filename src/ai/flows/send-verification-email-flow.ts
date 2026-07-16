
'use server';
/**
 * @fileOverview A Genkit flow for sending 6-digit verification codes to email.
 * - sendVerificationCode - Sends a code to the specified email.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VerificationInputSchema = z.object({
  email: z.string().email().describe('The user email address.'),
  userName: z.string().describe('The name of the user.'),
});
export type VerificationInput = z.infer<typeof VerificationInputSchema>;

const VerificationOutputSchema = z.object({
  success: z.boolean(),
  code: z.string().describe('The generated 6-digit verification code.'),
});
export type VerificationOutput = z.infer<typeof VerificationOutputSchema>;

/**
 * Initiates email verification process. 
 * In a real production system, this would call an SMTP service like Resend.
 */
export async function sendVerificationCode(input: VerificationInput): Promise<VerificationOutput> {
  return sendVerificationCodeFlow(input);
}

const sendVerificationCodeFlow = ai.defineFlow(
  {
    name: 'sendVerificationCodeFlow',
    inputSchema: VerificationInputSchema,
    outputSchema: VerificationOutputSchema,
  },
  async (input) => {
    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Logic to send email would go here.
    // For this prototype, we simulate the success.
    console.log(`[NUXUS KERNEL] Sending code ${code} to ${input.email}`);
    
    return {
      success: true,
      code: code,
    };
  }
);
