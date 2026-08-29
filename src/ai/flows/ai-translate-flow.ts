
'use server';
/**
 * @fileOverview AI Translation Stub (DEACTIVATED)
 */
export async function translateMessage(input: any): Promise<{ translatedText: string }> {
  return { translatedText: input.text || "" };
}
