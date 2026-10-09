import { NextRequest, NextResponse } from 'next/server';
import { getSLAConfig, saveSLAConfig, getSLAStats, getSLAStatsByPeriod, SLAConfig } from '@/lib/sla';
import { requireAdmin } from '@/lib/admin-auth';

// GET /api/admin/sla - Get SLA statistics and config
export async function GET(req: NextRequest) {
  // Check session cookie
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    if (type === 'config') {
      const config = await getSLAConfig();
      return NextResponse.json({ config });
    }

    if (type === 'periods') {
      const periods = await getSLAStatsByPeriod();
      return NextResponse.json({ periods });
    }

    // Default: get all data
    const [config, stats, periods] = await Promise.all([
      getSLAConfig(),
      getSLAStats(),
      getSLAStatsByPeriod(),
    ]);

    return NextResponse.json({
      config,
      stats,
      periods,
    });
  } catch (error) {
    console.error('SLA API error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der SLA-Daten' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/sla - Update SLA config
export async function PUT(req: NextRequest) {
  // Check session cookie
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const config: SLAConfig = body.config;

    // Validate config
    if (!config.firstResponseHours || !config.resolutionHours) {
      return NextResponse.json(
        { error: 'Ungültige SLA-Konfiguration' },
        { status: 400 }
      );
    }

    // Validate all values are positive numbers
    const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    for (const priority of priorities) {
      if (
        typeof config.firstResponseHours[priority] !== 'number' ||
        config.firstResponseHours[priority] <= 0 ||
        typeof config.resolutionHours[priority] !== 'number' ||
        config.resolutionHours[priority] <= 0
      ) {
        return NextResponse.json(
          { error: 'Alle SLA-Zeiten müssen positive Zahlen sein' },
          { status: 400 }
        );
      }
    }

    await saveSLAConfig(config);

    return NextResponse.json({
      success: true,
      message: 'SLA-Konfiguration gespeichert',
      config,
    });
  } catch (error) {
    console.error('SLA config update error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der SLA-Konfiguration' },
      { status: 500 }
    );
  }
}
