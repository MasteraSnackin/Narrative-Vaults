import { Router } from 'express';
import { checkMarketConditions } from '../../services/market.service';
import { getNarrativeById } from '../../config/narratives';

const router = Router();

// GET /api/market/check/:narrativeId
router.get('/check/:narrativeId', async (req, res) => {
    try {
        const { narrativeId } = req.params;
        const narrative = getNarrativeById(narrativeId);

        if (!narrative) {
            return res.status(404).json({ error: 'Narrative not found' });
        }

        const result = await checkMarketConditions(narrative);
        res.json(result);
    } catch (error) {
        console.error('Market check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
