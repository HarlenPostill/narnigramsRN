import Foundation

struct PlacedWord: Hashable, Sendable {
    let word: String
    let cells: [Cell]
}

enum BoardRules {
    static func isConnected(_ board: Board) -> Bool {
        guard let start = board.keys.first else { return false }
        var seen: Set<Cell> = [start]
        var queue = [start]
        while let cell = queue.popLast() {
            for n in cell.neighbors where board[n] != nil && !seen.contains(n) {
                seen.insert(n)
                queue.append(n)
            }
        }
        return seen.count == board.count
    }

    static func words(on board: Board) -> [PlacedWord] {
        var result: [PlacedWord] = []
        for cell in board.keys {
            if board[cell.left] == nil {
                var cells: [Cell] = []
                var c = cell
                while board[c] != nil { cells.append(c); c = c.right }
                if cells.count >= 2 { result.append(PlacedWord(word: String(cells.map { board[$0]!.letter }), cells: cells)) }
            }
            if board[cell.up] == nil {
                var cells: [Cell] = []
                var c = cell
                while board[c] != nil { cells.append(c); c = c.down }
                if cells.count >= 2 { result.append(PlacedWord(word: String(cells.map { board[$0]!.letter }), cells: cells)) }
            }
        }
        return result
    }

    struct Validation: Sendable {
        var isValid: Bool
        var invalidCells: Set<Cell>
        var words: [PlacedWord]
        var disconnected: Bool
    }

    static func validate(_ board: Board, dictionary: Set<String>) -> Validation {
        guard !board.isEmpty else { return Validation(isValid: false, invalidCells: [], words: [], disconnected: false) }
        let connected = isConnected(board)
        let words = words(on: board)
        var invalid = Set<Cell>()
        for w in words where !dictionary.contains(w.word) { invalid.formUnion(w.cells) }
        // A lone tile is fine only when it's the entire board.
        if words.isEmpty && board.count > 1 { invalid.formUnion(board.keys) }
        if board.count == 1 { return Validation(isValid: false, invalidCells: Set(board.keys), words: [], disconnected: false) }
        return Validation(isValid: connected && invalid.isEmpty, invalidCells: invalid, words: words, disconnected: !connected)
    }
}
