import SwiftUI
import UIKit

/// The play surface. One finger on empty felt pans, two fingers pinch-zoom around their
/// midpoint (and pan with it), and tiles lift the moment you touch them.
struct BoardView: View {
    @Bindable var session: GameSession
    let interaction: GameInteraction
    var tileGesture: (Tile, GameInteraction.Source) -> AnyGesture<Void>

    @State private var lastPan: CGSize = .zero

    var body: some View {
        GeometryReader { geo in
            let viewport = geo.size
            ZStack(alignment: .topLeading) {
                Color.felt
                GridDots(interaction: interaction)
                dropGhost
                ForEach(Array(session.board), id: \.value.id) { cell, tile in
                    let c = interaction.cell
                    TileView(letter: tile.letter, size: c - 4,
                             isSelected: session.selection == .board(cell),
                             isInvalid: session.invalidCells.contains(cell))
                        .frame(width: c, height: c)
                        .contentShape(Rectangle())
                        .opacity(interaction.draggingID == tile.id ? 0 : 1)
                        .gesture(tileGesture(tile, .board(cell)))
                        .position(x: interaction.offset.x + (CGFloat(cell.col) + 0.5) * c,
                                  y: interaction.offset.y + (CGFloat(cell.row) + 0.5) * c)
                }
            }
            .frame(width: viewport.width, height: viewport.height)
            .contentShape(Rectangle())
            .clipped()
            .gesture(panGesture(viewport))
            .onTapGesture(coordinateSpace: .named(GameInteraction.space)) { p in
                session.tap(cell: interaction.cell(at: p))
            }
            .gesture(PinchPanRecognizer(interaction: interaction, viewport: viewport))
            .overlay(alignment: .bottomTrailing) {
                Button { interaction.fit(session.board, viewport: viewport) } label: {
                    Image(systemName: "viewfinder")
                        .font(.body.weight(.semibold))
                        .frame(width: 40, height: 40)
                        .background(.regularMaterial, in: Circle())
                }
                .padding(12)
                .accessibilityLabel("Fit board to screen")
            }
            .onAppear { interaction.centerIfNeeded(on: session.board, viewport: viewport) }
            .onChange(of: viewport) { _, size in interaction.pan(by: .zero, viewport: size) }
        }
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(GameInteraction.space)) } action: {
            interaction.boardFrame = $0
        }
        .animation(.spring(response: 0.25, dampingFraction: 0.8), value: session.board.count)
        .accessibilityLabel("Board")
    }

    private func panGesture(_ viewport: CGSize) -> some Gesture {
        DragGesture(minimumDistance: 2)
            .onChanged { v in
                interaction.pan(by: CGSize(width: v.translation.width - lastPan.width, height: v.translation.height - lastPan.height), viewport: viewport)
                lastPan = v.translation
            }
            .onEnded { _ in lastPan = .zero }
    }

    /// Where the lifted tile will land. Accent outline for an empty cell, a swap badge for an occupied one.
    @ViewBuilder private var dropGhost: some View {
        if case .cell(let cell) = interaction.target {
            let c = interaction.cell
            let occupied = session.board[cell] != nil && session.board[cell]?.id != interaction.draggingID
            RoundedRectangle(cornerRadius: c * 0.2, style: .continuous)
                .fill(Color.accentColor.opacity(occupied ? 0.0 : 0.14))
                .strokeBorder(Color.accentColor, style: StrokeStyle(lineWidth: 2, dash: occupied ? [] : [5, 4]))
                .frame(width: c - 2, height: c - 2)
                .overlay(alignment: .topTrailing) {
                    if occupied {
                        Image(systemName: "arrow.left.arrow.right.circle.fill")
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(.white, Color.accentColor)
                            .font(.system(size: max(14, c * 0.36)))
                            .offset(x: c * 0.18, y: -c * 0.18)
                    }
                }
                .position(x: interaction.offset.x + (CGFloat(cell.col) + 0.5) * c,
                          y: interaction.offset.y + (CGFloat(cell.row) + 0.5) * c)
                .zIndex(occupied ? 2 : 0)
                .allowsHitTesting(false)
        }
    }
}

/// Dots at grid intersections, drawn only for the visible area.
private struct GridDots: View {
    let interaction: GameInteraction

    var body: some View {
        Canvas { ctx, size in
            let c = interaction.cell, o = interaction.offset
            let dot = max(1.5, c * 0.055)
            let firstCol = max(0, Int(floor(-o.x / c))), lastCol = min(BoardBounds.size, Int(ceil((size.width - o.x) / c)))
            let firstRow = max(0, Int(floor(-o.y / c))), lastRow = min(BoardBounds.size, Int(ceil((size.height - o.y) / c)))
            guard firstCol <= lastCol, firstRow <= lastRow else { return }
            var path = Path()
            for r in firstRow...lastRow {
                for col in firstCol...lastCol {
                    let p = CGPoint(x: o.x + CGFloat(col) * c, y: o.y + CGFloat(r) * c)
                    path.addEllipse(in: CGRect(x: p.x - dot / 2, y: p.y - dot / 2, width: dot, height: dot))
                }
            }
            ctx.fill(path, with: .color(.secondary.opacity(0.4)))
            // Soft edge so players can see where the grid ends.
            let side = c * CGFloat(BoardBounds.size)
            ctx.stroke(Path(roundedRect: CGRect(x: o.x, y: o.y, width: side, height: side), cornerRadius: c * 0.3),
                       with: .color(.secondary.opacity(0.25)), lineWidth: 1)
        }
        .allowsHitTesting(false)
    }
}

/// UIKit pinch so we get the live finger midpoint every frame, which SwiftUI's MagnifyGesture lacks.
private struct PinchPanRecognizer: UIGestureRecognizerRepresentable {
    let interaction: GameInteraction
    let viewport: CGSize

    final class Coordinator {
        var last: CGPoint?
        var touches = 0
    }

    func makeCoordinator(converter: CoordinateSpaceConverter) -> Coordinator { Coordinator() }

    func makeUIGestureRecognizer(context: Context) -> UIPinchGestureRecognizer { UIPinchGestureRecognizer() }

    func handleUIGestureRecognizerAction(_ recognizer: UIPinchGestureRecognizer, context: Context) {
        let point = context.converter.localLocation
        let state = context.coordinator
        switch recognizer.state {
        case .began:
            state.last = point
            state.touches = recognizer.numberOfTouches
            recognizer.scale = 1
        case .changed:
            // Lifting or adding a finger moves the midpoint; re-anchor instead of jumping.
            if recognizer.numberOfTouches != state.touches || state.last == nil {
                state.touches = recognizer.numberOfTouches
                state.last = point
                recognizer.scale = 1
                return
            }
            let last = state.last!
            interaction.pan(by: CGSize(width: point.x - last.x, height: point.y - last.y), viewport: viewport)
            interaction.zoom(by: recognizer.scale, around: point, viewport: viewport)
            recognizer.scale = 1
            state.last = point
        default:
            state.last = nil
        }
    }
}
