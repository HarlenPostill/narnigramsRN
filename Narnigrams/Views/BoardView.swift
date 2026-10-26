import SwiftUI

/// Scrollable, pinch-zoomable 41×41 grid. Tap to place the selected tile, or drag tiles in.
struct BoardView: View {
    @Bindable var session: GameSession
    @State private var cellSize: CGFloat = 44
    @GestureState private var pinch: CGFloat = 1

    private var cell: CGFloat { min(72, max(26, cellSize * pinch)) }
    private var side: CGFloat { cell * CGFloat(BoardBounds.size) }

    var body: some View {
        ScrollView([.horizontal, .vertical], showsIndicators: false) {
            ZStack(alignment: .topLeading) {
                Canvas { ctx, size in
                    let dot = max(1.5, cell * 0.05)
                    for r in 0...BoardBounds.size {
                        for c in 0...BoardBounds.size {
                            let p = CGPoint(x: CGFloat(c) * cell, y: CGFloat(r) * cell)
                            ctx.fill(Path(ellipseIn: CGRect(x: p.x - dot / 2, y: p.y - dot / 2, width: dot, height: dot)),
                                     with: .color(.secondary.opacity(0.35)))
                        }
                    }
                }
                .frame(width: side, height: side)

                ForEach(session.board.sorted(by: { $0.value.id < $1.value.id }), id: \.value.id) { cellPos, tile in
                    TileView(letter: tile.letter, size: cell - 3,
                             isSelected: session.selection == .board(cellPos),
                             isInvalid: session.invalidCells.contains(cellPos))
                        .draggable(String(tile.id)) { TileView(letter: tile.letter, size: cell) }
                        .onTapGesture { session.tap(cell: cellPos) }
                        .position(x: (CGFloat(cellPos.col) + 0.5) * cell, y: (CGFloat(cellPos.row) + 0.5) * cell)
                        .transition(.scale(scale: 0.6).combined(with: .opacity))
                }
            }
            .frame(width: side, height: side)
            .contentShape(Rectangle())
            .onTapGesture(coordinateSpace: .local) { point in
                session.tap(cell: cellAt(point))
            }
            .dropDestination(for: String.self) { items, point in
                guard let id = items.first.flatMap(Int.init) else { return false }
                session.place(tileID: id, at: cellAt(point))
                return true
            }
            .animation(.spring(duration: 0.22), value: session.board.count)
        }
        .defaultScrollAnchor(.center)
        .simultaneousGesture(
            MagnifyGesture()
                .updating($pinch) { value, state, _ in state = value.magnification }
                .onEnded { value in cellSize = min(72, max(26, cellSize * value.magnification)) }
        )
        .background(Color.felt)
        .accessibilityLabel("Board")
    }

    private func cellAt(_ point: CGPoint) -> Cell {
        Cell(row: Int(point.y / cell), col: Int(point.x / cell))
    }
}
