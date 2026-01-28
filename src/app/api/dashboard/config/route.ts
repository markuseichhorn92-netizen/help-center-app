import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig, getImages } from '@/lib/dashboard/kv';
import { requireAuth } from '@/lib/dashboard/auth';
import { PublicConfig } from '@/lib/dashboard/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const config = await getConfig();
    const images = await getImages();

    const sortedImages = [...images].sort((a, b) => (a.order || 0) - (b.order || 0));

    const publicConfig: PublicConfig = {
      leaderboardUrl: config.leaderboardUrl,
      lastModified: config.lastModified,
      carouselEnabled: config.carouselEnabled,
      leaderboardDuration: config.leaderboardDuration,
      imageDuration: config.imageDuration,
      images: sortedImages.map(img => img.name),
      openingHours: config.openingHours,
      showClock: config.showClock,
      showWeather: config.showWeather,
      showOpeningStatus: config.showOpeningStatus,
      weatherCity: config.weatherCity,
      weatherLat: config.weatherLat,
      weatherLon: config.weatherLon,
      layout: config.layout,
      transitionEffect: config.transitionEffect,
      tickerText: config.tickerText,
      specialDays: config.specialDays || [],
    };

    return NextResponse.json(publicConfig, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error getting config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.leaderboardUrl !== undefined) updates.leaderboardUrl = body.leaderboardUrl;
    if (body.carouselEnabled !== undefined) updates.carouselEnabled = Boolean(body.carouselEnabled);
    if (body.leaderboardDuration !== undefined) updates.leaderboardDuration = parseInt(body.leaderboardDuration, 10) || 30;
    if (body.imageDuration !== undefined) updates.imageDuration = parseInt(body.imageDuration, 10) || 10;
    if (body.sessionTimeout !== undefined) updates.sessionTimeout = parseInt(body.sessionTimeout, 10) || 86400;
    if (body.openingHours !== undefined) updates.openingHours = body.openingHours;
    if (body.showClock !== undefined) updates.showClock = Boolean(body.showClock);
    if (body.showWeather !== undefined) updates.showWeather = Boolean(body.showWeather);
    if (body.showOpeningStatus !== undefined) updates.showOpeningStatus = Boolean(body.showOpeningStatus);
    if (body.weatherCity !== undefined) updates.weatherCity = body.weatherCity;
    if (body.weatherLat !== undefined) updates.weatherLat = parseFloat(body.weatherLat) || 49.75;
    if (body.weatherLon !== undefined) updates.weatherLon = parseFloat(body.weatherLon) || 6.64;
    if (body.layout !== undefined) updates.layout = body.layout;
    if (body.transitionEffect !== undefined) updates.transitionEffect = body.transitionEffect;
    if (body.tickerText !== undefined) updates.tickerText = body.tickerText;
    if (body.specialDays !== undefined) updates.specialDays = body.specialDays;

    await saveConfig(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
