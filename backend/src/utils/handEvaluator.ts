import { Card } from './cardUtils';

export enum HandRank {
  HIGH_CARD = 1,
  PAIR = 2,
  COLOR = 3,      // Flush
  SEQUENCE = 4,   // Straight
  PURE_SEQUENCE = 5, // Straight Flush
  TRAIL = 6       // Three of a Kind
}

export interface HandEvaluation {
  rank: HandRank;
  value: number; // For comparing hands of same rank
  name: string;
  cards: Card[];
}

/**
 * Evaluates a Teen Patti hand (3 cards)
 */
export const evaluateHand = (cards: Card[]): HandEvaluation => {
  if (cards.length !== 3) {
    throw new Error('Teen Patti hands must have exactly 3 cards');
  }

  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);

  // Check for Trail (Three of a Kind)
  if (values[0] === values[1] && values[1] === values[2]) {
    return {
      rank: HandRank.TRAIL,
      value: values[0] * 1000, // Higher trail wins
      name: `Trail of ${sorted[0].rank}s`,
      cards: sorted
    };
  }

  // Check if all same suit (needed for Pure Sequence and Color)
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];

  // Check for Sequence (Straight)
  const isSequence = checkSequence(values);

  // Pure Sequence (Straight Flush)
  if (isFlush && isSequence) {
    return {
      rank: HandRank.PURE_SEQUENCE,
      value: getSequenceValue(values),
      name: `Pure Sequence (${sorted[2].rank}-${sorted[1].rank}-${sorted[0].rank})`,
      cards: sorted
    };
  }

  // Sequence (Straight)
  if (isSequence) {
    return {
      rank: HandRank.SEQUENCE,
      value: getSequenceValue(values),
      name: `Sequence (${sorted[2].rank}-${sorted[1].rank}-${sorted[0].rank})`,
      cards: sorted
    };
  }

  // Color (Flush)
  if (isFlush) {
    return {
      rank: HandRank.COLOR,
      value: values[0] * 100 + values[1] * 10 + values[2],
      name: `Color (${suits[0]})`,
      cards: sorted
    };
  }

  // Check for Pair
  if (values[0] === values[1]) {
    return {
      rank: HandRank.PAIR,
      value: values[0] * 100 + values[2], // Pair value + kicker
      name: `Pair of ${sorted[0].rank}s`,
      cards: sorted
    };
  }
  if (values[1] === values[2]) {
    return {
      rank: HandRank.PAIR,
      value: values[1] * 100 + values[0], // Pair value + kicker
      name: `Pair of ${sorted[1].rank}s`,
      cards: sorted
    };
  }

  // High Card
  return {
    rank: HandRank.HIGH_CARD,
    value: values[0] * 100 + values[1] * 10 + values[2],
    name: `High Card ${sorted[0].rank}`,
    cards: sorted
  };
};

/**
 * Checks if three values form a sequence
 * Special case: A-2-3 is valid (A=14, 2=2, 3=3)
 */
const checkSequence = (values: number[]): boolean => {
  const sorted = [...values].sort((a, b) => a - b);

  // Normal sequence: consecutive values
  if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
    return true;
  }

  // Special case: A-2-3 (values: 2, 3, 14)
  if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14) {
    return true;
  }

  return false;
};

/**
 * Gets the value for a sequence (for comparison)
 * A-K-Q is highest, A-2-3 is lowest
 */
const getSequenceValue = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);

  // Special case: A-2-3 is the lowest sequence
  if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14) {
    return 1; // Lowest sequence value
  }

  // Normal sequence: use highest card value
  return sorted[2] * 100;
};

/**
 * Compares two hands
 * Returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
export const compareHands = (cards1: Card[], cards2: Card[]): number => {
  const eval1 = evaluateHand(cards1);
  const eval2 = evaluateHand(cards2);

  // Compare rank first
  if (eval1.rank > eval2.rank) return 1;
  if (eval1.rank < eval2.rank) return -1;

  // Same rank, compare value
  if (eval1.value > eval2.value) return 1;
  if (eval1.value < eval2.value) return -1;

  // Exact tie (very rare)
  return 0;
};

/**
 * Gets a human-readable hand name
 */
export const getHandName = (cards: Card[]): string => {
  return evaluateHand(cards).name;
};

/**
 * Gets the hand rank name
 */
export const getHandRankName = (rank: HandRank): string => {
  switch (rank) {
    case HandRank.TRAIL: return 'Trail';
    case HandRank.PURE_SEQUENCE: return 'Pure Sequence';
    case HandRank.SEQUENCE: return 'Sequence';
    case HandRank.COLOR: return 'Color';
    case HandRank.PAIR: return 'Pair';
    case HandRank.HIGH_CARD: return 'High Card';
    default: return 'Unknown';
  }
};
