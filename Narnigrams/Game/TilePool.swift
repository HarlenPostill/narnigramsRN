import Foundation

/// Deterministic SplitMix64 so every player in an online match derives the same pool.
struct SeededRandom: RandomNumberGenerator, Sendable {
    private var state: UInt64
    init(seed: UInt64) { state = seed }

    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}

enum TilePool {
    /// Letter weights per 144 tiles, inherited from the original Narnigrams.
    private static let weights: [(Character, Int)] = [
        ("A", 13), ("B", 3), ("C", 3), ("D", 6), ("E", 18), ("F", 3), ("G", 4), ("H", 3), ("I", 12),
        ("J", 2), ("K", 2), ("L", 5), ("M", 3), ("N", 8), ("O", 11), ("P", 3), ("Q", 2), ("R", 9),
        ("S", 6), ("T", 9), ("U", 6), ("V", 3), ("W", 3), ("X", 2), ("Y", 3), ("Z", 2),
    ]

    static func make(size: Int, seed: UInt64) -> [Tile] {
        let scale = Double(size) / 144
        var counts = weights.map { ($0.0, Int((Double($0.1) * scale).rounded())) }
        let diff = size - counts.reduce(0) { $0 + $1.1 }
        if let e = counts.firstIndex(where: { $0.0 == "E" }) {
            counts[e].1 = max(1, counts[e].1 + diff)
        }
        var letters: [Character] = counts.flatMap { Array(repeating: $0.0, count: $0.1) }
        var rng = SeededRandom(seed: seed)
        letters.shuffle(using: &rng)
        return letters.enumerated().map { Tile(id: $0.offset, letter: $0.element) }
    }
}
