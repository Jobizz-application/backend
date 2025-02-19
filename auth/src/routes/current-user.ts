import { currentUser } from '@jobizzapp/common';
import express from 'express';

const router = express.Router();

router.get('/api/currentuser', currentUser, (req, res) => {
  res.status(200).send({ currentUser: req.currentUser || null });
});

export { router as currentUserRouter };
