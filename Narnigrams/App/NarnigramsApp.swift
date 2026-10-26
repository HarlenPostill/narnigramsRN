import SwiftUI

@main
struct NarnigramsApp: App {
    @State private var words = WordList()
    @State private var gameCenter = GameCenter()
    @State private var stats = StatsStore()
    @State private var online = OnlineMatch()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(words)
                .environment(gameCenter)
                .environment(stats)
                .environment(online)
                .task {
                    gameCenter.authenticate()
                    online.listenForInvites(words: words)
                    await words.load()
                }
        }
    }
}

struct RootView: View {
    @Environment(WordList.self) private var words
    @Environment(GameCenter.self) private var gameCenter
    @Environment(OnlineMatch.self) private var online
    @State private var session: GameSession?

    var body: some View {
        HomeView(start: start)
            .fullScreenCover(item: $session) { s in
                GameView(session: s,
                         onPlayAgain: s.mode == .online ? nil : { start(s.mode) },
                         onClose: close)
            }
            .onChange(of: online.session?.id) { _, _ in
                if let s = online.session { session = s }
            }
            .onChange(of: session == nil) { _, isHome in
                gameCenter.setAccessPoint(visible: isHome)
            }
            #if DEBUG
            .onChange(of: words.isLoaded) { _, loaded in
                // `-demoGame` jumps straight into a Practice game for screenshots.
                if loaded, ProcessInfo.processInfo.arguments.contains("-demoGame") { start(.practice(.hard)) }
            }
            #endif
            .onChange(of: gameCenter.isAuthenticated) { _, _ in
                gameCenter.setAccessPoint(visible: session == nil)
            }
    }

    private func start(_ mode: GameMode) {
        if mode == .online {
            online.findMatch(words: words)
            return
        }
        session?.cancel()
        session = GameSession(mode: mode, words: words)
    }

    private func close() {
        if session?.mode == .online { online.leave() }
        session?.cancel()
        session = nil
    }
}
