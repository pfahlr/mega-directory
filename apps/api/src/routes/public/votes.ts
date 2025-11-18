/**
 * Voting routes
 * Handles upvote/downvote operations
 */
import express = require('express');
import { Request, Response } from 'express';
import { VoteType } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { optionalAuth } from '../../middleware/userAuth';
import { submitVote, getVoteCounts, getUserVote } from '../../services/voteService';

const router = express.Router();

/**
 * POST /v1/votes
 * Submit or update vote (upvote/downvote/toggle)
 */
router.post(
  '/',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { listing_id, vote_type } = req.body;

    // Validate listing_id
    if (!listing_id || typeof listing_id !== 'number') {
      res.status(400).json({ error: 'listing_id is required and must be a number' });
      return;
    }

    // Validate vote_type (null, "UPVOTE", or "DOWNVOTE")
    if (vote_type !== null && vote_type !== 'UPVOTE' && vote_type !== 'DOWNVOTE') {
      res.status(400).json({ error: 'vote_type must be null, "UPVOTE", or "DOWNVOTE"' });
      return;
    }

    // Get user ID (anonymous or authenticated)
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required to vote' });
      return;
    }

    try {
      const voteType = vote_type as VoteType | null;
      const result = await submitVote(userId, listing_id, voteType);

      res.json({
        vote: result.vote ? {
          user_id: result.vote.userId,
          listing_id: result.vote.listingId,
          vote_type: result.vote.voteType,
        } : null,
        counts: {
          upvote_count: result.counts.upvoteCount,
          downvote_count: result.counts.downvoteCount,
          net_score: result.counts.netScore,
        },
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /v1/votes/:listing_id
 * Get vote counts for a listing
 */
router.get(
  '/:listing_id',
  asyncHandler(async (req: Request, res: Response) => {
    const listingId = parseInt(req.params.listing_id, 10);

    if (isNaN(listingId)) {
      res.status(400).json({ error: 'Invalid listing ID' });
      return;
    }

    try {
      const counts = await getVoteCounts(listingId);

      res.json({
        listing_id: listingId,
        upvote_count: counts.upvoteCount,
        downvote_count: counts.downvoteCount,
        net_score: counts.netScore,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /v1/votes/:listing_id/user
 * Get current user's vote for a listing
 */
router.get(
  '/:listing_id/user',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const listingId = parseInt(req.params.listing_id, 10);

    if (isNaN(listingId)) {
      res.status(400).json({ error: 'Invalid listing ID' });
      return;
    }

    const userId = req.user?.id;

    if (!userId) {
      res.json({ vote: null });
      return;
    }

    try {
      const vote = await getUserVote(userId, listingId);

      res.json({
        vote: vote ? {
          user_id: vote.userId,
          listing_id: vote.listingId,
          vote_type: vote.voteType,
        } : null,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

export default router;
