import SwiftUI

struct ResultView: View {
    let session: GameSession
    var onPlayAgain: (() -> Void)?
    var onDone: () -> Void
    @Environment(GameCenter.self) private var gameCenter

    private var title: String {
        switch session.outcome {
        case .won: "Narnigrams!"
        case .lost(let winner): "\(winner) finished first"
        case .abandoned: "Match ended"
        case nil: ""
        }
    }

    private var longest: String? { session.placedWords.max { $0.count < $1.count } }

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if session.outcome == .won {
                    TileWord(word: "WON", size: 52).padding(.top, 12)
                }
                Text(title).font(.largeTitle.bold()).multilineTextAlignment(.center)
                if case .abandoned(let reason) = session.outcome {
                    Text(reason).foregroundStyle(.secondary)
                }

                Grid(horizontalSpacing: 32, verticalSpacing: 6) {
                    GridRow {
                        Text(Duration.seconds(session.elapsed), format: .time(pattern: .minuteSecond))
                        Text("\(session.board.count)")
                        Text(longest ?? "—")
                    }
                    .font(.title2.monospacedDigit().weight(.semibold))
                    GridRow {
                        Text("Time"); Text("Tiles placed"); Text("Longest word")
                    }
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }

                VStack(spacing: 10) {
                    if let onPlayAgain {
                        Button(action: onPlayAgain) { Text("Play again").frame(maxWidth: .infinity) }
                            .buttonStyle(.borderedProminent)
                    }
                    Button(action: onDone) { Text("Done").frame(maxWidth: .infinity) }
                        .buttonStyle(.bordered)
                    if gameCenter.isAuthenticated {
                        Button("View leaderboards") { gameCenter.show(.leaderboards) }
                            .font(.subheadline)
                    }
                }
                .controlSize(.large)
                .padding(.horizontal)
            }
            .padding()
            .frame(maxWidth: 480)
        }
    }
}
