import Foundation

/// One physical tile. `id` is its index in the seeded pool, so every device that
/// builds the pool from the same seed agrees on what each id means.
struct Tile: Identifiable, Hashable, Codable, Sendable {
    let id: Int
    let letter: Character

    var points: Int { Tile.points[letter] ?? 1 }

    static let points: [Character: Int] = [
        "A": 1, "B": 3, "C": 3, "D": 2, "E": 1, "F": 4, "G": 2, "H": 4, "I": 1,
        "J": 8, "K": 5, "L": 1, "M": 3, "N": 1, "O": 1, "P": 3, "Q": 10, "R": 1,
        "S": 1, "T": 1, "U": 1, "V": 4, "W": 4, "X": 8, "Y": 4, "Z": 10,
    ]

    enum CodingKeys: String, CodingKey { case id, letter }
    init(id: Int, letter: Character) { self.id = id; self.letter = letter }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        letter = Character(try c.decode(String.self, forKey: .letter))
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(String(letter), forKey: .letter)
    }
}

struct Cell: Hashable, Codable, Sendable {
    var row: Int
    var col: Int

    var up: Cell { Cell(row: row - 1, col: col) }
    var down: Cell { Cell(row: row + 1, col: col) }
    var left: Cell { Cell(row: row, col: col - 1) }
    var right: Cell { Cell(row: row, col: col + 1) }
    var neighbors: [Cell] { [up, down, left, right] }
}

typealias Board = [Cell: Tile]

enum GameLength: String, CaseIterable, Codable, Identifiable, Sendable {
    case short, medium, long
    var id: String { rawValue }

    var poolSize: Int {
        switch self { case .short: 50; case .medium: 72; case .long: 100 }
    }
    var handSize: Int {
        switch self { case .short: 11; case .medium: 15; case .long: 21 }
    }
    var title: String {
        switch self { case .short: "Short"; case .medium: "Medium"; case .long: "Long" }
    }
}

enum BotLevel: String, CaseIterable, Codable, Identifiable, Sendable {
    case easy, medium, hard
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

enum GameMode: Hashable, Codable, Sendable {
    case solo(GameLength)
    case practice(BotLevel)
    case online
}

/// Board grid bounds. The original app capped coordinates at 40; we keep that.
enum BoardBounds {
    static let size = 41
    static let center = Cell(row: 20, col: 20)
    static func contains(_ cell: Cell) -> Bool {
        (0..<size).contains(cell.row) && (0..<size).contains(cell.col)
    }
}
