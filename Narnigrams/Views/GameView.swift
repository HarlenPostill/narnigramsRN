import SwiftUI

/// Adapts between a stacked layout (outer screens, portrait phones) and a side rail
/// (foldable inner screens, landscape). State lives in `GameSession`, so folding
/// or rotating mid-game never loses progress.
///
/// Dragging is the main way to play: touch any tile to lift it, then drop it on the board
/// (an occupied cell swaps), back into the hand at any position, or on Dump.
struct GameView: View {
    @Bindable var session: GameSession
    var onPlayAgain: (() -> Void)?
    var onClose: () -> Void

    @Environment(StatsStore.self) private var stats
    @Environment(GameCenter.self) private var gameCenter
    @State private var interaction = GameInteraction()
    @State private var confirmQuit = false

    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width > 640 && geo.size.width > geo.size.height * 0.9
            Group {
                if wide {
                    HStack(spacing: 0) {
                        board
                        Divider().ignoresSafeArea()
                        VStack(spacing: 16) {
                            header
                            hand(tileSize: 48)
                            Spacer(minLength: 0)
                            actions
                        }
                        .padding()
                        .frame(width: min(400, geo.size.width * 0.36))
                        .background(.background)
                    }
                } else {
                    VStack(spacing: 0) {
                        header.padding(.horizontal).padding(.vertical, 8)
                        board
                        VStack(spacing: 12) {
                            actions
                            hand(tileSize: geo.size.width < 380 ? 40 : 44)
                        }
                        .padding(.horizontal)
                        .padding(.top, 12)
                        .padding(.bottom, 8)
                        .background(.background)
                    }
                }
            }
        }
        .coordinateSpace(.named(GameInteraction.space))
        .overlay { FloatingTile(interaction: interaction) }
        .overlay(alignment: .top) { messageBanner }
        .sheet(isPresented: .constant(session.isOver)) {
            ResultView(session: session, onPlayAgain: onPlayAgain, onDone: onClose)
                .presentationDetents([.medium, .large])
                .interactiveDismissDisabled()
        }
        .confirmationDialog("Leave this game?", isPresented: $confirmQuit, titleVisibility: .visible) {
            Button("Leave game", role: .destructive, action: onClose)
        } message: {
            Text(session.mode == .online ? "Leaving an online match counts as a loss." : "Your progress won't be saved.")
        }
        .onChange(of: session.outcome) { _, outcome in
            guard let outcome else { return }
            if case .abandoned = outcome { return }
            stats.record(GameRecord(date: .now, mode: session.mode.statsKey, won: outcome == .won,
                                    seconds: session.elapsed, tilesPlaced: session.board.count))
            gameCenter.report(session: session, stats: stats)
        }
        .onChange(of: session.canDump, initial: true) { _, can in interaction.canDump = can }
        .onAppear { gameCenter.setAccessPoint(visible: false) }
    }

    private var board: some View {
        BoardView(session: session, interaction: interaction, tileGesture: tileGesture)
    }

    private func hand(tileSize: CGFloat) -> some View {
        HandView(session: session, interaction: interaction, tileSize: tileSize, tileGesture: tileGesture)
    }

    // MARK: Drag and drop

    /// Lifts on touch-down. A touch that never travels counts as a tap (select / pick back up).
    private func tileGesture(_ tile: Tile, _ source: GameInteraction.Source) -> AnyGesture<Void> {
        AnyGesture(
            DragGesture(minimumDistance: 0, coordinateSpace: .named(GameInteraction.space))
                .onChanged { v in
                    if interaction.drag == nil {
                        guard !session.isOver else { return }
                        let center: CGPoint = switch source {
                        case .board(let cell): interaction.center(of: cell)
                        case .hand: interaction.handTileFrames[tile.id].map { CGPoint(x: $0.midX, y: $0.midY) } ?? v.startLocation
                        }
                        interaction.begin(tile, from: source, finger: v.startLocation, tileCenter: center)
                    }
                    interaction.move(to: v.location, translation: v.translation)
                }
                .onEnded { _ in
                    guard let (drag, target) = interaction.end() else { return }
                    guard drag.moved else {
                        switch drag.source {
                        case .hand: session.tapHand(drag.tile)
                        case .board(let cell): session.tap(cell: cell)
                        }
                        return
                    }
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.8)) {
                        switch target {
                        case .cell(let cell): session.drop(tileID: drag.tile.id, on: cell)
                        case .hand(let index): session.moveToHand(tileID: drag.tile.id, at: index)
                        case .dump: session.dump(tileID: drag.tile.id)
                        case nil: break
                        }
                    }
                }
                .map { _ in () }
        )
    }

    // MARK: Chrome

    private var header: some View {
        HStack(alignment: .center, spacing: 16) {
            Button { session.isOver ? onClose() : (confirmQuit = true) } label: {
                Image(systemName: "xmark").font(.body.weight(.semibold))
            }
            .buttonStyle(.bordered)
            .buttonBorderShape(.circle)
            .accessibilityLabel("Leave game")

            TimelineView(.periodic(from: session.startDate, by: 1)) { _ in
                Text(Duration.seconds(session.elapsed), format: .time(pattern: .minuteSecond))
                    .font(.title3.monospacedDigit().weight(.semibold))
            }
            .accessibilityLabel("Time")

            Spacer(minLength: 0)

            ForEach(session.opponents) { opponent in
                VStack(alignment: .trailing, spacing: 0) {
                    Text(opponent.name).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    Text("\(opponent.tilesPlaced) placed")
                        .font(.caption.monospacedDigit().weight(.semibold))
                        .foregroundStyle(opponent.connected ? .primary : .tertiary)
                }
                .frame(maxWidth: 90, alignment: .trailing)
            }

            Label("\(session.pileCount)", systemImage: "square.stack.3d.up.fill")
                .font(.subheadline.monospacedDigit().weight(.semibold))
                .accessibilityLabel("\(session.pileCount) tiles left in the pile")
        }
    }

    private var actions: some View {
        HStack(spacing: 8) {
            Button { session.shuffleHand() } label: { Image(systemName: "shuffle") }
                .accessibilityLabel("Shuffle hand")
            Button { withAnimation(.spring(response: 0.3)) { session.returnAll() } } label: { Image(systemName: "arrow.down.to.line") }
                .accessibilityLabel("Return all tiles to hand")
                .disabled(session.board.isEmpty)

            DumpButton(session: session, interaction: interaction)

            Spacer(minLength: 0)

            Button(action: session.peel) {
                Text(session.canFinish ? "Finish" : "Peel")
                    .font(.headline)
                    .frame(minWidth: 64)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(!session.hand.isEmpty || session.isOver)
        }
        .buttonStyle(.bordered)
        .controlSize(.regular)
    }

    @ViewBuilder private var messageBanner: some View {
        if let message = session.message {
            Text(message)
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(.thinMaterial, in: Capsule())
                .padding(.top, 60)
                .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}

/// Drop a tile here (or select one and tap) to swap it for two from the pile.
private struct DumpButton: View {
    let session: GameSession
    let interaction: GameInteraction

    private var hovering: Bool { interaction.target == .dump }
    private var armed: Bool { session.canDump && (session.selection != nil || interaction.drag != nil) }

    var body: some View {
        Button { session.dumpSelected() } label: {
            Label("Dump", systemImage: hovering ? "arrow.triangle.2.circlepath.circle.fill" : "arrow.triangle.2.circlepath")
                .lineLimit(1)
                .fixedSize()
        }
        .tint(hovering ? .orange : nil)
        .buttonStyle(.bordered)
        .disabled(!armed && !hovering)
        .scaleEffect(hovering ? 1.12 : 1)
        .animation(.spring(response: 0.22, dampingFraction: 0.7), value: hovering)
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(GameInteraction.space)) } action: {
            interaction.dumpFrame = $0
        }
        .accessibilityHint("Swap the selected tile for \(session.dumpDraw) from the pile")
    }
}

/// The tile under your finger, drawn above everything else.
private struct FloatingTile: View {
    let interaction: GameInteraction

    var body: some View {
        if let drag = interaction.drag {
            TileView(letter: drag.tile.letter, size: interaction.floatingSize, isLifted: true)
                .position(drag.center)
                .animation(.spring(response: 0.2, dampingFraction: 0.8), value: interaction.floatingSize)
                .allowsHitTesting(false)
                .transition(.identity)
        }
    }
}

struct HandView: View {
    @Bindable var session: GameSession
    let interaction: GameInteraction
    var tileSize: CGFloat
    var tileGesture: (Tile, GameInteraction.Source) -> AnyGesture<Void>

    private var hovered: Int? {
        if case .hand(let i) = interaction.target { return i }
        return nil
    }

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: tileSize + 2, maximum: tileSize + 8), spacing: 6)], spacing: 10) {
            ForEach(session.hand) { tile in
                TileView(letter: tile.letter, size: tileSize,
                         isSelected: session.selection == .hand(tile.id),
                         tilt: Double((tile.id * 37) % 5) - 2)
                    .frame(width: tileSize + 6, height: tileSize + 10)
                    .contentShape(Rectangle())
                    .opacity(interaction.draggingID == tile.id ? 0.0 : 1)
                    .gesture(tileGesture(tile, .hand))
                    .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(GameInteraction.space)) } action: {
                        interaction.handTileFrames[tile.id] = $0
                    }
                    .onDisappear { interaction.handTileFrames[tile.id] = nil }
            }
        }
        .padding(8)
        .frame(minHeight: tileSize + 26)
        .background {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(hovered != nil ? AnyShapeStyle(Color.accentColor.opacity(0.12)) : AnyShapeStyle(.quaternary.opacity(0.6)))
                .strokeBorder(hovered != nil ? Color.accentColor.opacity(0.6) : .clear, lineWidth: 1.5)
        }
        .overlay {
            if session.hand.isEmpty && interaction.drag == nil {
                Text(session.canFinish ? "Every tile is down. Tap Finish." : "Hand empty. Tap Peel to draw.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            if case .board(let cell) = session.selection { session.returnToHand(cell) }
        }
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(GameInteraction.space)) } action: {
            interaction.handTileSize = tileSize
            interaction.handFrame = $0
        }
        .animation(.spring(response: 0.28, dampingFraction: 0.82), value: session.hand.map(\.id))
        .accessibilityLabel("Your hand")
    }
}
