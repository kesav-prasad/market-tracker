import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import prisma from '../db';

const router = Router();

// GET all instruments
router.get('/', async (req, res) => {
  try {
    const instruments = await prisma.instrument.findMany({
      include: {
        marketCalendar: true,
        dailyMetrics: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    res.json({ success: true, data: instruments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST new instrument
router.post('/', async (req, res) => {
  try {
    const { symbol, name, category, exchange, provider, providerSymbol, currency, marketCalendarId } = req.body;
    
    // Check for duplicates
    const existing = await prisma.instrument.findFirst({
      where: { symbol, exchange }
    });
    
    if (existing) {
      return res.status(400).json({ success: false, error: 'Instrument with this symbol and exchange already exists.' });
    }

    const instrument = await prisma.instrument.create({
      data: {
        symbol,
        name,
        category,
        exchange,
        provider,
        providerSymbol,
        currency,
        marketCalendarId,
        isActive: true
      }
    });

    // Trigger background historical data backfill
    const scriptPath = path.join(__dirname, '../scripts/backfill-single-instrument.js');
    const child = spawn('node', [scriptPath, symbol], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    res.json({ success: true, data: instrument });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update instrument
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, exchange, provider, providerSymbol, isActive, marketCalendarId } = req.body;

    const instrument = await prisma.instrument.update({
      where: { id },
      data: {
        name,
        category,
        exchange,
        provider,
        providerSymbol,
        isActive,
        marketCalendarId
      }
    });

    res.json({ success: true, data: instrument });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// DELETE instruments (single or bulk)
router.post('/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'Expected an array of ids' });
    }

    await prisma.$transaction([
      prisma.priceObservation.deleteMany({ where: { instrumentId: { in: ids } } }),
      prisma.dailyMetric.deleteMany({ where: { instrumentId: { in: ids } } }),
      prisma.corporateActionFactor.deleteMany({ where: { instrumentId: { in: ids } } }),
      prisma.instrument.deleteMany({ where: { id: { in: ids } } })
    ]);

    res.json({ success: true, deletedCount: ids.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
