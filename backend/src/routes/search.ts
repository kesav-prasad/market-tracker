import { Router } from 'express';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const router = Router();

router.get('/', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.json({ success: true, data: [] });
    }

    const results = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
    
    // Filter and map the results
    const mappedResults = (results.quotes || []).filter((q: any) => q.isYahooFinance).map((q: any) => ({
      symbol: q.symbol,
      shortName: q.shortname || q.longname || q.symbol,
      longName: q.longname || q.shortname || '',
      exchange: q.exchDisp || q.exchange || '',
      quoteType: q.quoteType || ''
    }));

    res.json({ success: true, data: mappedResults });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
