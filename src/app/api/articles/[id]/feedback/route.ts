import { NextRequest, NextResponse } from 'next/server';
import { submitFeedback, getArticleFeedback, hasVoted, generateVisitorHash } from '@/lib/feedback';

// GET - Get feedback status for an article
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Get visitor hash from header or generate one
    const visitorHash = req.headers.get('x-visitor-hash') || '';

    const [feedback, voted] = await Promise.all([
      getArticleFeedback(id),
      visitorHash ? hasVoted(id, visitorHash) : Promise.resolve(false),
    ]);

    return NextResponse.json({
      ...feedback,
      hasVoted: voted,
    });
  } catch (error) {
    console.error('Error getting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to get feedback' },
      { status: 500 }
    );
  }
}

// POST - Submit feedback for an article
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { helpful, visitorHash: clientHash } = body;

    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'helpful must be a boolean' },
        { status: 400 }
      );
    }

    // Use client-provided hash or generate one from headers
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown';
    const visitorHash = clientHash || generateVisitorHash(userAgent, ip);

    const result = await submitFeedback(id, helpful, visitorHash);

    if (result.alreadyVoted) {
      return NextResponse.json(
        { error: 'Already voted', alreadyVoted: true },
        { status: 409 }
      );
    }

    // Return updated feedback
    const feedback = await getArticleFeedback(id);

    return NextResponse.json({
      success: true,
      ...feedback,
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
