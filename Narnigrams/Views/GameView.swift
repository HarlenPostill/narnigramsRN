import SwiftUI

/// Adapts between a stacked layout (outer screens, portrait phones) and a side rail
/// (foldable inner screens, landscape, iPad). State lives in `GameSession`, so folding
/// or rotating mid-game never loses progress.
struct GameView: View {
    @Bindable var session: GameSession
    var onPlayAgain: (() -> Void)?
    var onClose: () -> Void

    @Environment(StatsStore.self) private var stats
    @Environment(GameCenter.self) private var gameCenter
    @State private var confirmQuit = false

    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width > 640 && geo.size.width > geo.size.height * 0.9
            Group {
                if wide {
                    HStack(spacing: 0) {
                        BoardView(session: session)
                        Divider()
                        VStack(spacing: 16) {
                            header
                            HandView(session: session, tileSize: 46)
                            Spacer(minLength: 0)
                            actions
                        }
                        .padding()
                        .frame(width: min(380, geo.size.width * 0.36))
                        .background(.background)
                    }
                } else {
                    VStack(spacing: 0) {
                        header.padding(.horizontal).padding(.vertical, 8)
                        BoardView(session: session)
                        VStack(spacing: 12) {
                            actions
                            HandView(session: session, tileSize: geo.size.width < 380 ? 38 : 42)
                        }
                        .padding()
                        .background(.background)
                    }
                }
            }
        }
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
        .onAppear { gameCenter.setAccessPoint(visible: false) }
        .statusBarHidden(false)
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline, spacing: 16) {
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
        HStack(spacing: 10) {
            Button { session.shuffleHand() } label: { Image(systemName: "shuffle") }
                .accessibilityLabel("Shuffle hand")
            Button { session.returnAll() } label: { Image(systemName: "arrow.down.to.line") }
                .accessibilityLabel("Return all tiles to hand")
                .disabled(session.board.isEmpty)
            Button { session.dumpSelected() } label: {
                Label("Dump", systemImage: "arrow.triangle.2.circlepath")
                    .lineLimit(1)
                    .fixedSize()
            }
            .disabled(session.selection == nil || !session.canDump)
            .dropDestination(for: String.self) { items, _ in
                guard let id = items.first.flatMap(Int.init) else { return false }
                session.dump(tileID: id)
                return true
            }
            .accessibilityHint("Swap the selected tile for \(session.dumpDraw) from the pile")

            Spacer(minLength: 0)

            Button(action: session.peel) {
                Text(session.canFinish ? "Finish" : "Peel")
                    .font(.headline)
                    .frame(minWidth: 72)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!session.hand.isEmpty || session.isOver)
        }
        .buttonStyle(.bordered)
        .controlSize(.large)
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

struct HandView: View {
    @Bindable var session: GameSession
    var tileSize: CGFloat

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: tileSize, maximum: tileSize + 4), spacing: 6)], spacing: 8) {
            ForEach(session.hand) { tile in
                TileView(letter: tile.letter, size: tileSize,
                         isSelected: session.selection == .hand(tile.id),
                         tilt: Double((tile.id * 37) % 7) - 3)
                    .onTapGesture { session.tapHand(tile) }
                    .draggable(String(tile.id)) { TileView(letter: tile.letter, size: tileSize) }
            }
        }
        .frame(minHeight: tileSize + 8)
        .overlay {
            if session.hand.isEmpty {
                Text(session.canFinish ? "Every tile is down. Tap Finish." : "Hand empty. Tap Peel to draw.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            if case .board(let cell) = session.selection { session.returnToHand(cell) }
        }
        .dropDestination(for: String.self) { items, _ in
            guard let id = items.first.flatMap(Int.init) else { return false }
            session.returnTile(id: id)
            return true
        }
        .animation(.spring(duration: 0.25), value: session.hand.map(\.id))
        .accessibilityLabel("Your hand")
    }
}
