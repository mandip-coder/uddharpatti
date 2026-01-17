export type Suit = 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // For comparison (2=2, ..., J=11, Q=12, K=13, A=14)
}

const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  RANKS.forEach((rank, index) => {
    SUITS.forEach((suit) => {
      deck.push({
        suit,
        rank,
        value: index + 2,
      });
    });
  });
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// Simple hand evaluation helpers (placeholder for full logic)
// Evaluates which hand is better.
// For Teen Patti: Trail (Three of a Kind) > Pure Sequence > Sequence > Color (Flush) > Pair > High Card
