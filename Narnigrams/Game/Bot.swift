import Foundation

struct BotConfig: Sendable {
    var delay: ClosedRange<Double>
    var maxWordLength: Int
    var searchBudget: Int
    var candidateLimit: Int

    static func `for`(_ level: BotLevel) -> BotConfig {
        switch level {
        case .easy: BotConfig(delay: 3.0...5.0, maxWordLength: 6, searchBudget: 250, candidateLimit: 200)
        case .medium: BotConfig(delay: 1.5...3.0, maxWordLength: 8, searchBudget: 250, candidateLimit: 400)
        case .hard: BotConfig(delay: 0.8...1.5, maxWordLength: 12, searchBudget: 800, candidateLimit: 1000)
        }
    }
}

/// The Practice opponent. It plays with real tiles from the shared pool and never fabricates a win.
struct Bot: Sendable {
    var hand: [Tile]
    var board: Board = [:]
    var decision: UInt64 = 0

    var tilesPlaced: Int { board.count }

    struct Placement: Sendable { var board: Board; var hand: [Tile] }

    /// Bounded crossword search; every candidate uses owned tiles and must validate every crossword.
    static func findPlacement(hand: [Tile], board: Board, config: BotConfig, words: [String], dictionary: Set<String>, seed: UInt64) -> Placement? {
        var rng = SeededRandom(seed: seed)
        var counts: [Character: Int] = [:]
        for t in hand { counts[t.letter, default: 0] += 1 }
        let slack = board.isEmpty ? 0 : 1
        let maxLen = min(config.maxWordLength, hand.count + slack)
        guard maxLen >= 2 else { return nil }

        var bands: [Int: [String]] = [:]
        for word in words where word.count <= maxLen {
            var need: [Character: Int] = [:]
            for ch in word { need[ch, default: 0] += 1 }
            let missing = need.reduce(0) { $0 + max(0, $1.value - (counts[$1.key] ?? 0)) }
            if missing <= slack { bands[word.count, default: []].append(word) }
        }
        let perLength = max(1, config.candidateLimit / max(1, config.maxWordLength - 1))
        var ordered: [String] = []
        for length in stride(from: maxLen, through: 2, by: -1) {
            guard let band = bands[length], !band.isEmpty else { continue }
            let shift = Int.random(in: 0..<band.count, using: &rng)
            ordered += Array((band[shift...] + band[..<shift]).prefix(perLength))
        }

        let entries = Array(board)
        let anchors: [(Cell, Tile?)] = entries.isEmpty
            ? [(BoardBounds.center, nil)]
            : { let s = Int.random(in: 0..<entries.count, using: &rng); return (entries[s...] + entries[..<s]).map { ($0.key, $0.value) } }()

        var inspected = 0
        for word in ordered {
            let letters = Array(word)
            for (origin, anchor) in anchors {
                for index in letters.indices {
                    if let anchor { if anchor.letter != letters[index] { continue } } else if index != 0 { continue }
                    for vertical in [false, true] {
                        inspected += 1
                        if inspected > config.searchBudget { return nil }
                        var next = board
                        var left = hand
                        var added = 0
                        var possible = true
                        for i in letters.indices {
                            let cell = vertical ? Cell(row: origin.row + i - index, col: origin.col) : Cell(row: origin.row, col: origin.col + i - index)
                            guard BoardBounds.contains(cell) else { possible = false; break }
                            if let existing = next[cell] {
                                if existing.letter != letters[i] { possible = false; break }
                                continue
                            }
                            guard let ti = left.firstIndex(where: { $0.letter == letters[i] }) else { possible = false; break }
                            next[cell] = left.remove(at: ti)
                            added += 1
                        }
                        if possible, added > 0, BoardRules.validate(next, dictionary: dictionary).isValid {
                            return Placement(board: next, hand: left)
                        }
                    }
                }
            }
        }
        return nil
    }
}
