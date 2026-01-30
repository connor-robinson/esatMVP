import { NextRequest, NextResponse } from 'next/server';

/**
 * Bug Report API Route
 * 
 * Sends bug reports via email using Resend API.
 * 
 * Setup:
 * 1. Sign up for Resend at https://resend.com (free tier available)
 * 2. Get your API key from https://resend.com/api-keys
 * 3. Add to .env.local: RESEND_API_KEY=your_api_key_here
 * 4. Add to .env.local: BUG_REPORT_EMAIL=your-email@example.com
 * 
 * Alternative: You can use any email service by modifying this route.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, questionId, stepsToReproduce, additionalInfo } = body;

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.BUG_REPORT_EMAIL;

    // If Resend is not configured, log to console (for development)
    if (!resendApiKey || !recipientEmail) {
      console.log('=== BUG REPORT (Email not configured) ===');
      console.log('Description:', description);
      console.log('Question ID:', questionId);
      console.log('Steps to Reproduce:', stepsToReproduce);
      console.log('Additional Info:', additionalInfo);
      console.log('Timestamp:', new Date().toISOString());
      console.log('========================================');
      
      return NextResponse.json({
        success: true,
        message: 'Bug report logged (email not configured - check console)',
      });
    }

    // Send email via Resend
    const emailBody = `
Bug Report from Review App

Description:
${description}

${questionId ? `Question ID: ${questionId}` : ''}

${stepsToReproduce ? `Steps to Reproduce:\n${stepsToReproduce}` : ''}

${additionalInfo ? `Additional Info:\n${additionalInfo}` : ''}

---
Timestamp: ${new Date().toISOString()}
    `.trim();

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Review App <onboarding@resend.dev>', // Change this to your verified domain
        to: recipientEmail,
        subject: `Bug Report: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
        text: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API error:', errorData);
      throw new Error('Failed to send email');
    }

    return NextResponse.json({
      success: true,
      message: 'Bug report sent successfully',
    });
  } catch (error: any) {
    console.error('Bug report error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send bug report' },
      { status: 500 }
    );
  }
}



