import prisma from './src/db';
async function backfillLastSeries() {
    const instruments = await prisma.instrument.findMany();
    // Find the latest finalized series for each instrument
    for (const inst of instruments) {
        const lastSeriesMetric = await prisma.dailyMetric.findFirst({
            where: {
                instrumentId: inst.id,
                series: {
                    isFinalized: true
                }
            },
            orderBy: [
                { series: { expectedExpiryDate: 'desc' } },
                { date: 'desc' }
            ],
            include: {
                series: true
            }
        });
        if (lastSeriesMetric && lastSeriesMetric.seriesChange !== null) {
            console.log(`Backfilling ${inst.symbol} with ${lastSeriesMetric.seriesChange}% from ${lastSeriesMetric.series.expectedExpiryDate.toISOString()}`);
            await prisma.instrument.update({
                where: { id: inst.id },
                data: {
                    lastSeriesChangePercent: lastSeriesMetric.seriesChange,
                    lastSeriesEndDate: lastSeriesMetric.series.expectedExpiryDate
                }
            });
        }
        else {
            console.log(`No prior series data for ${inst.symbol}`);
        }
    }
}
backfillLastSeries().catch(console.error).finally(() => prisma.$disconnect());
