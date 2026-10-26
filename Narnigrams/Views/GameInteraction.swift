import SwiftUI
import Observation

/// Owns everything about touching the game: the tile under your finger, where it can land,
/// and the board camera. Kept apart from `GameSession` so a 60fps drag only re-renders
/// the floating tile, not the whole board.
@MainActor @Observable
final class GameInteraction {
    static let space = "game"
    static let baseCell: CGFloat = 46
    static let scaleRange: ClosedRange<CGFloat> = 0.45...1.9

    enum Source: Equatable {
        case hand
        case board(Cell)
    }

    enum Target: Equatable {
        case cell(Cell)
        case hand(index: Int)
        case dump
    }

    struct Drag {
        let tile: Tile
        let source: Source
        /// Tile centre minus finger position at pickup, so the tile never jumps under your finger.
        let grab: CGSize
        var location: CGPoint
        var moved = false
        var center: CGPoint { CGPoint(x: location.x + grab.width, y: location.y + grab.height) }
    }

    // Drag
    private(set) var drag: Drag?
    private(set) var target: Target?
    var draggingID: Int? { drag?.tile.id }

    // Drop target frames, in the `game` coordinate space.
    var boardFrame: CGRect = .zero
    var handFrame: CGRect = .zero
    var dumpFrame: CGRect = .zero
    var handTileFrames: [Int: CGRect] = [:]
    var handTileSize: CGFloat = 44
    var canDump = false

    // Camera: board-space origin in viewport coordinates, plus zoom.
    var scale: CGFloat = 1
    var offset: CGPoint = .zero
    private var centered = false
    var cell: CGFloat { Self.baseCell * scale }

    // MARK: Camera

    func centerIfNeeded(on board: Board, viewport: CGSize) {
        guard !centered, viewport.width > 0 else { return }
        centered = true
        fit(board, viewport: viewport, animated: false)
    }

    /// Frames every placed tile, or the middle of the grid when it's empty.
    func fit(_ board: Board, viewport: CGSize, animated: Bool = true) {
        let cells = board.isEmpty ? [BoardBounds.center] : Array(board.keys)
        let minR = cells.map(\.row).min()!, maxR = cells.map(\.row).max()!
        let minC = cells.map(\.col).min()!, maxC = cells.map(\.col).max()!
        let cols = CGFloat(maxC - minC + 3), rows = CGFloat(maxR - minR + 3)
        let fitScale = min(viewport.width / (cols * Self.baseCell), viewport.height / (rows * Self.baseCell))
        let newScale = min(1.0, max(Self.scaleRange.lowerBound, fitScale))
        let c = Self.baseCell * newScale
        let midX = (CGFloat(minC + maxC) / 2 + 0.5) * c
        let midY = (CGFloat(minR + maxR) / 2 + 0.5) * c
        let apply = {
            self.scale = newScale
            self.offset = self.clamped(CGPoint(x: viewport.width / 2 - midX, y: viewport.height / 2 - midY), viewport: viewport)
        }
        if animated { withAnimation(.spring(response: 0.4, dampingFraction: 0.85), apply) } else { apply() }
    }

    func pan(by delta: CGSize, viewport: CGSize) {
        offset = clamped(CGPoint(x: offset.x + delta.width, y: offset.y + delta.height), viewport: viewport)
    }

    /// Zoom by `factor` keeping the board point under `focus` (viewport coordinates) fixed.
    func zoom(by factor: CGFloat, around focus: CGPoint, viewport: CGSize) {
        let newScale = min(Self.scaleRange.upperBound, max(Self.scaleRange.lowerBound, scale * factor))
        let k = newScale / scale
        scale = newScale
        offset = clamped(CGPoint(x: focus.x - (focus.x - offset.x) * k, y: focus.y - (focus.y - offset.y) * k), viewport: viewport)
    }

    /// The viewport centre must stay over the grid, so the board can never be flung out of sight.
    private func clamped(_ p: CGPoint, viewport: CGSize) -> CGPoint {
        let side = cell * CGFloat(BoardBounds.size)
        return CGPoint(x: min(viewport.width / 2, max(viewport.width / 2 - side, p.x)),
                       y: min(viewport.height / 2, max(viewport.height / 2 - side, p.y)))
    }

    /// Centre of a grid cell in the `game` space.
    func center(of c: Cell) -> CGPoint {
        CGPoint(x: boardFrame.minX + offset.x + (CGFloat(c.col) + 0.5) * cell,
                y: boardFrame.minY + offset.y + (CGFloat(c.row) + 0.5) * cell)
    }

    func cell(at p: CGPoint) -> Cell {
        Cell(row: Int(floor((p.y - boardFrame.minY - offset.y) / cell)),
             col: Int(floor((p.x - boardFrame.minX - offset.x) / cell)))
    }

    // MARK: Drag

    func begin(_ tile: Tile, from source: Source, finger: CGPoint, tileCenter: CGPoint) {
        guard drag == nil else { return }
        drag = Drag(tile: tile, source: source, grab: CGSize(width: tileCenter.x - finger.x, height: tileCenter.y - finger.y), location: finger)
        target = nil
        Haptics.pickUp()
    }

    func move(to finger: CGPoint, translation: CGSize) {
        guard var d = drag else { return }
        d.location = finger
        if hypot(translation.width, translation.height) > 6 { d.moved = true }
        drag = d
        refreshTarget()
        startAutoPanIfNeeded()
    }

    private func refreshTarget() {
        guard let d = drag else { return }
        let t = d.moved ? resolveTarget(d.center) : nil
        if t != target {
            target = t
            if t != nil { Haptics.hover() }
        }
    }

    // MARK: Edge auto-pan

    private var autoPan: Task<Void, Never>?

    /// Holding a tile near the board's edge scrolls the board that way, faster the closer you get.
    private var edgeVelocity: CGSize {
        guard let d = drag, d.moved, case .cell = target else { return .zero }
        let zone: CGFloat = 36, maxSpeed: CGFloat = 9
        let p = d.center, f = boardFrame
        func speed(_ distance: CGFloat) -> CGFloat { distance < zone ? maxSpeed * (1 - max(0, distance) / zone) : 0 }
        return CGSize(width: speed(p.x - f.minX) - speed(f.maxX - p.x),
                      height: speed(p.y - f.minY) - speed(f.maxY - p.y))
    }

    private func startAutoPanIfNeeded() {
        guard autoPan == nil, edgeVelocity != .zero else { return }
        autoPan = Task { [weak self] in
            while !Task.isCancelled, let self, self.drag != nil {
                let v = self.edgeVelocity
                if v == .zero { break }
                self.pan(by: v, viewport: self.boardFrame.size)
                self.refreshTarget()
                try? await Task.sleep(for: .milliseconds(16))
            }
            self?.autoPan = nil
        }
    }

    /// Finishes the drag and returns what happened so the view can act on it.
    func end() -> (drag: Drag, target: Target?)? {
        guard let d = drag else { return nil }
        let t = d.moved ? resolveTarget(d.center) : nil
        autoPan?.cancel()
        autoPan = nil
        drag = nil
        target = nil
        return (d, t)
    }

    /// Size the floating tile should be: board scale over the board, hand scale elsewhere.
    var floatingSize: CGFloat {
        if case .cell = target { return cell - 4 }
        return handTileSize
    }

    private func resolveTarget(_ p: CGPoint) -> Target? {
        if canDump, dumpFrame.insetBy(dx: -14, dy: -14).contains(p) { return .dump }
        if handFrame.insetBy(dx: 0, dy: -10).contains(p) { return .hand(index: handIndex(at: p)) }
        if boardFrame.contains(p) {
            let c = cell(at: p)
            return BoardBounds.contains(c) ? .cell(c) : nil
        }
        return nil
    }

    /// Insertion index in the hand: before the nearest tile, or after it if the drop is to its right.
    private func handIndex(at p: CGPoint) -> Int {
        let others = handTileFrames.filter { $0.key != draggingID }
        guard let nearest = others.min(by: { dist($0.value, p) < dist($1.value, p) }) else { return 0 }
        let order = others.sorted { ($0.value.minY, $0.value.minX) < ($1.value.minY, $1.value.minX) }.map(\.key)
        let i = order.firstIndex(of: nearest.key) ?? 0
        return p.x > nearest.value.midX ? i + 1 : i
    }

    private func dist(_ r: CGRect, _ p: CGPoint) -> CGFloat { hypot(r.midX - p.x, r.midY - p.y) }
}
