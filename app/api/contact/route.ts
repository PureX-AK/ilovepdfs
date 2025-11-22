import { NextRequest, NextResponse } from 'next/server';
import { createContactSubmission } from '../../lib/models/Contact';
import { sendContactNotification, sendAutoReply } from '../../lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, subject, message, priority, newsletter } = body;

    // Validation
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Message must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Create contact submission
    const submission = await createContactSubmission(
      firstName,
      lastName,
      email,
      subject,
      message,
      priority || 'low',
      newsletter || false
    );

    // Send email notification to admin (non-blocking)
    sendContactNotification({
      firstName,
      lastName,
      email,
      subject,
      message,
      priority: priority || 'low',
    }).catch(error => {
      console.error('Failed to send admin notification email:', error);
      // Don't fail the request if email fails
    });

    // Send auto-reply to user (non-blocking)
    sendAutoReply({
      email,
      firstName,
    }).catch(error => {
      console.error('Failed to send auto-reply email:', error);
      // Don't fail the request if email fails
    });

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully. We\'ll get back to you within 24 hours.',
      submissionId: submission._id,
    });
  } catch (error: any) {
    console.error('Contact submission error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}

