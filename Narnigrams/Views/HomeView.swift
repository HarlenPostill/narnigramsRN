import SwiftUI

struct HomeView: View {
    var start: (GameMode) -> Void

    @Environment(WordList.self) private var words
    @Environment(GameCenter.self) private var gameCenter
    @Environment(StatsStore.self) private var stats
    @Environment(OnlineMatch.self) private var online
    @State private var showStats = false
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(spacing: 14) {
                        TileWord(word: "NARNIGRAMS", size: 30)
                            .dynamicTypeSize(.large)
                        Text("Build one connected grid of words. Use every tile.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .listRowBackground(Color.clear)
                }

                Section("Online") {
                    Button { start(.online) } label: {
                        row("Find a match", detail: gameCenter.isAuthenticated ? "2–4 players via Game Center" : "Sign in to Game Center to play online",
                            icon: "person.2.fill")
                    }
                    .disabled(!gameCenter.isAuthenticated)
                    if case .failed(let reason) = online.phase {
                        Text(reason).font(.footnote).foregroundStyle(.red)
                    }
                }

                Section("Solo") {
                    ForEach(GameLength.allCases) { length in
                        Button { start(.solo(length)) } label: {
                            row(length.title, detail: soloDetail(length), icon: "square.grid.3x3.fill")
                        }
                    }
                }

                Section {
                    ForEach(BotLevel.allCases) { level in
                        Button { start(.practice(level)) } label: {
                            row("\(level.title) bot", detail: "Race for the shared pile", icon: "cpu")
                        }
                    }
                } header: {
                    Text("Practice")
                } footer: {
                    Text("Practice games stay offline and never touch your ranking.")
                }

                Section("Game Center") {
                    Button { gameCenter.show(.leaderboards) } label: { Label("Leaderboards", systemImage: "list.number") }
                    Button { gameCenter.show(.achievements) } label: { Label("Achievements", systemImage: "rosette") }
                }
                .disabled(!gameCenter.isAuthenticated)
            }
            .tint(.primary)
            .disabled(!words.isLoaded)
            .overlay {
                if !words.isLoaded { ProgressView("Loading dictionary") }
            }
            .scrollContentBackground(.hidden)
            .background(Color.felt)
            .navigationTitle("Narnigrams")
            .toolbarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showStats = true } label: { Image(systemName: "chart.bar.xaxis") }
                        .accessibilityLabel("Stats")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                        .accessibilityLabel("Settings")
                }
            }
            .sheet(isPresented: $showStats) { StatsView() }
            .sheet(isPresented: $showSettings) { SettingsView() }
        }
    }

    private func soloDetail(_ length: GameLength) -> String {
        var text = "\(length.poolSize) tiles"
        if let best = stats.best(for: GameMode.solo(length).statsKey) {
            text += ", best " + Duration.seconds(best).formatted(.time(pattern: .minuteSecond))
        }
        return text
    }

    private func row(_ title: String, detail: String, icon: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
                .foregroundStyle(Color.accentColor)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body.weight(.semibold)).foregroundStyle(.primary)
                Text(detail).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
        }
        .contentShape(Rectangle())
    }
}
