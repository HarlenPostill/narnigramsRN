import Foundation
import Observation

/// Shared draw pile for online play. The match host owns the real pile; everyone else asks.
@MainActor
protocol OnlinePileAuthority: AnyObject {
    func requestPeel()
    func requestDump(tileID: Int)
    func claimFinish()
    func reportProgress(placed: Int, inHand: Int)
}

struct Opponent: Identifiable, Hashable {
    let id: String
    var name: String
    var tilesPlaced: Int = 0
    var inHand: Int = 0
    var connected = true
}

enum Selection: Equatable {
    case hand(Int)
    case board(Cell)
}

enum GameOutcome: Equatable {
    case won
    case lost(winner: String)
    case abandoned(reason: String)
}

@MainActor @Observable
final class GameSession: Identifiable {
    let id = UUID()
    let mode: GameMode
    let dumpDraw = 2

    private(set) var tiles: [Tile]
    private(set) var hand: [Tile] = []
    private(set) var board: Board = [:]
    /// Local modes own the pile. Online mode only mirrors its size.
    private var pile: [Int] = []
    private(set) var pileCount = 0
    private(set) var playerCount: Int

    var selection: Selection?
    private(set) var invalidCells: Set<Cell> = []
    private(set) var message: String?
    private(set) var startDate = Date()
    private(set) var endDate: Date?
    private(set) var outcome: GameOutcome?

    private(set) var dumps = 0
    private(set) var peels = 0
    private(set) var bot: Bot?
    var opponents: [Opponent] = []

    weak var authority: OnlinePileAuthority?
    private let dictionary: Set<String>
    private let botWords: [String]
    private var botTask: Task<Void, Never>?
    private let seed: UInt64

    var elapsed: TimeInterval { (endDate ?? Date()).timeIntervalSince(startDate) }
    var isOver: Bool { outcome != nil }
    var canFinish: Bool { hand.isEmpty && pileCount < playerCount }

    init(mode: GameMode, seed: UInt64 = .random(in: 1...UInt64.max), words: WordList) {
        self.mode = mode
        self.seed = seed
        self.dictionary = words.words
        self.botWords = words.botWords
        let length: GameLength = switch mode {
        case .solo(let l): l
        case .practice, .online: .medium
        }
        tiles = TilePool.make(size: length.poolSize, seed: seed)
        playerCount = 1
        var ids = tiles.map(\.id)
        hand = ids.prefix(length.handSize).map { tiles[$0] }
        ids.removeFirst(length.handSize)
        if case .practice(let level) = mode {
            playerCount = 2
            bot = Bot(hand: ids.prefix(length.handSize).map { tiles[$0] })
            ids.removeFirst(length.handSize)
            opponents = [Opponent(id: "bot", name: "\(level.title) bot", inHand: length.handSize)]
            startBot(level)
        }
        pile = ids
        pileCount = ids.count
    }

    /// Online games are built from the host's seed and deal order.
    init(onlineSeed seed: UInt64, poolSize: Int, handSize: Int, order: [String], me: String, names: [String: String], words: WordList) {
        mode = .online
        self.seed = seed
        dictionary = words.words
        botWords = words.botWords
        tiles = TilePool.make(size: poolSize, seed: seed)
        playerCount = order.count
        let mine = order.firstIndex(of: me) ?? 0
        hand = Array(tiles[(mine * handSize)..<((mine + 1) * handSize)])
        pileCount = poolSize - order.count * handSize
        opponents = order.filter { $0 != me }.map { Opponent(id: $0, name: names[$0] ?? "Player", inHand: handSize) }
    }

    // MARK: Player actions

    func tap(cell: Cell) {
        guard !isOver else { return }
        if let tile = board[cell] {
            if selection == .board(cell) { returnToHand(cell) } else { selection = .board(cell) }
            Haptics.tap()
            return
        }
        switch selection {
        case .hand(let id): place(tileID: id, at: cell)
        case .board(let from): move(from: from, to: cell)
        case nil: break
        }
    }

    func tapHand(_ tile: Tile) {
        guard !isOver else { return }
        selection = selection == .hand(tile.id) ? nil : .hand(tile.id)
        Haptics.tap()
    }

    func place(tileID: Int, at cell: Cell) {
        guard !isOver, BoardBounds.contains(cell) else { return }
        if let from = board.first(where: { $0.value.id == tileID })?.key { move(from: from, to: cell); return }
        guard board[cell] == nil, let i = hand.firstIndex(where: { $0.id == tileID }) else { return }
        board[cell] = hand.remove(at: i)
        afterChange()
        // Keep the next tile selected so a word can be laid with consecutive taps.
        selection = nil
        Haptics.place()
    }

    func move(from: Cell, to: Cell) {
        guard from != to, board[to] == nil, BoardBounds.contains(to), let tile = board[from] else { return }
        board[from] = nil
        board[to] = tile
        selection = nil
        afterChange()
        Haptics.place()
    }

    func returnToHand(_ cell: Cell) {
        guard let tile = board.removeValue(forKey: cell) else { return }
        hand.append(tile)
        selection = nil
        afterChange()
    }

    /// Drops a tile on a cell. An occupied cell swaps: a board tile trades places,
    /// and a hand tile sends the occupant back to the hand slot it came from.
    @discardableResult
    func drop(tileID: Int, on cell: Cell) -> Bool {
        guard !isOver, BoardBounds.contains(cell) else { return false }
        let occupant = board[cell]
        if let from = board.first(where: { $0.value.id == tileID })?.key {
            guard from != cell else { return true }
            let tile = board[from]!
            board[from] = occupant
            board[cell] = tile
        } else if let i = hand.firstIndex(where: { $0.id == tileID }) {
            let tile = hand.remove(at: i)
            if let occupant { hand.insert(occupant, at: i) }
            board[cell] = tile
        } else {
            return false
        }
        selection = nil
        afterChange()
        Haptics.place()
        return true
    }

    /// Puts a tile into the hand at `index` (among the other hand tiles), from the board or the hand itself.
    func moveToHand(tileID: Int, at index: Int) {
        guard !isOver else { return }
        let tile: Tile
        if let cell = board.first(where: { $0.value.id == tileID })?.key {
            tile = board.removeValue(forKey: cell)!
            afterChange()
        } else if let i = hand.firstIndex(where: { $0.id == tileID }) {
            tile = hand.remove(at: i)
        } else { return }
        hand.insert(tile, at: min(max(0, index), hand.count))
        selection = nil
        Haptics.place()
    }

    func returnTile(id: Int) {
        if let cell = board.first(where: { $0.value.id == id })?.key { returnToHand(cell) }
    }

    func returnAll() {
        hand += board.values.sorted { $0.id < $1.id }
        board = [:]
        selection = nil
        afterChange()
    }

    func shuffleHand() {
        hand.shuffle()
        Haptics.tap()
    }

    var canDump: Bool { pileCount >= dumpDraw && !isOver }

    func dumpSelected() {
        switch selection {
        case .hand(let id): dump(tileID: id)
        case .board(let cell): if let t = board[cell] { dump(tileID: t.id) }
        case nil: break
        }
    }

    func dump(tileID: Int) {
        guard canDump else { return }
        if let cell = board.first(where: { $0.value.id == tileID })?.key { board[cell] = nil }
        else if let i = hand.firstIndex(where: { $0.id == tileID }) { hand.remove(at: i) }
        else { return }
        selection = nil
        dumps += 1
        if mode == .online {
            authority?.requestDump(tileID: tileID)
        } else {
            pile.append(tileID)
            let drawn = pile.prefix(dumpDraw).map { tiles[$0] }
            pile.removeFirst(dumpDraw)
            pileCount = pile.count
            hand += drawn
        }
        afterChange()
        Haptics.place()
    }

    /// The main action: draw when the board is clean, or finish when the pile can't serve everyone.
    func peel() {
        guard !isOver, hand.isEmpty else { return }
        let result = BoardRules.validate(board, dictionary: dictionary)
        guard result.isValid else {
            invalidCells = result.invalidCells.isEmpty ? Set(board.keys) : result.invalidCells
            message = result.disconnected ? "Every tile needs to connect to one grid." : "Fix the words marked in red."
            Haptics.error()
            return
        }
        if canFinish {
            if mode == .online { authority?.claimFinish() } else { finish(.won) }
            return
        }
        peels += 1
        if mode == .online {
            authority?.requestPeel()
        } else {
            hand.append(tiles[pile.removeFirst()])
            if bot != nil, !pile.isEmpty { bot?.hand.append(tiles[pile.removeFirst()]) }
            pileCount = pile.count
            syncBotOpponent()
        }
        Haptics.success()
    }

    private func afterChange() {
        invalidCells = []
        message = nil
        authority?.reportProgress(placed: board.count, inHand: hand.count)
    }

    // MARK: Online events from the match host

    func receive(tileIDs: [Int]) { hand += tileIDs.map { tiles[$0] } }
    func setPileCount(_ count: Int) { pileCount = count }
    func updateOpponent(_ id: String, placed: Int, inHand: Int) {
        guard let i = opponents.firstIndex(where: { $0.id == id }) else { return }
        opponents[i].tilesPlaced = placed
        opponents[i].inHand = inHand
    }
    func markDisconnected(_ id: String) {
        if let i = opponents.firstIndex(where: { $0.id == id }) { opponents[i].connected = false }
    }

    func finish(_ outcome: GameOutcome) {
        guard self.outcome == nil else { return }
        self.outcome = outcome
        endDate = Date()
        selection = nil
        botTask?.cancel()
        if outcome == .won { Haptics.success() }
    }

    /// Words currently on the board, for the result screen and achievements.
    var placedWords: [String] { BoardRules.words(on: board).map(\.word) }

    // MARK: Practice bot

    private func syncBotOpponent() {
        guard let bot, !opponents.isEmpty else { return }
        opponents[0].tilesPlaced = bot.tilesPlaced
        opponents[0].inHand = bot.hand.count
    }

    private func startBot(_ level: BotLevel) {
        let config = BotConfig.for(level)
        botTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(2))
            while !Task.isCancelled {
                guard let self, !self.isOver, var bot = self.bot else { return }
                bot.decision += 1
                let decisionSeed = self.seed &+ bot.decision &* 0x9E37_79B9
                let (hand, board, words, dict) = (bot.hand, bot.board, self.botWords, self.dictionary)
                let placement = await Task.detached(priority: .utility) {
                    hand.isEmpty ? nil : Bot.findPlacement(hand: hand, board: board, config: config, words: words, dictionary: dict, seed: decisionSeed)
                }.value
                var rng = SeededRandom(seed: decisionSeed)
                var delay = Double.random(in: config.delay, using: &rng)
                if self.isOver { return }
                if let placement {
                    delay *= Double(max(1, bot.hand.count - placement.hand.count))
                    bot.board = placement.board
                    bot.hand = placement.hand
                } else if bot.hand.isEmpty {
                    if self.pile.count < 2 { self.bot = bot; self.syncBotOpponent(); self.finish(.lost(winner: self.opponents.first?.name ?? "Bot")); return }
                    // Shared peel: both players draw.
                    bot.hand.append(self.tiles[self.pile.removeFirst()])
                    self.hand.append(self.tiles[self.pile.removeFirst()])
                    self.pileCount = self.pile.count
                } else if self.pile.count >= 2, let worst = bot.hand.max(by: { $0.points < $1.points }) {
                    bot.hand.removeAll { $0.id == worst.id }
                    self.pile.append(worst.id)
                    bot.hand += self.pile.prefix(2).map { self.tiles[$0] }
                    self.pile.removeFirst(2)
                    self.pileCount = self.pile.count
                } else {
                    // Stuck: rebuild from the same real tiles.
                    bot.hand += bot.board.values
                    bot.board = [:]
                }
                self.bot = bot
                self.syncBotOpponent()
                try? await Task.sleep(for: .seconds(delay))
            }
        }
    }

    func cancel() { botTask?.cancel() }
}
