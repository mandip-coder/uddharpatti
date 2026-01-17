import { Router, Request, Response } from 'express';
import { TABLE_TYPES } from '../config/tableConfig';

const router = Router();

// Get all available table types
router.get('/', (req: Request, res: Response) => {
  try {
    res.json({ tables: TABLE_TYPES });
  } catch (error) {
    console.error('Error fetching table types:', error);
    res.status(500).json({ message: 'Failed to fetch table types' });
  }
});

export default router;
