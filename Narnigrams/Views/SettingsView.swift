import SwiftUI

struct SettingsView: View {
    @Environment(GameCenter.self) private var gameCenter
    @Environment(\.dismiss) private var dismiss
    @AppStorage("haptics") private var haptics = true

    var body: some View {
        NavigationStack {
            Form {
                Section("Game Center") {
                    if gameCenter.isAuthenticated {
                        LabeledContent("Signed in as", value: gameCenter.playerName)
                        Button("Open Game Center") { gameCenter.show(.dashboard) }
                    } else {
                        Text(gameCenter.authError ?? "Sign in to Game Center in the Settings app to play online and earn achievements.")
                            .foregroundStyle(.secondary)
                        Button("Sign in") { gameCenter.authenticate() }
                    }
                }
                Section {
                    Toggle("Haptics", isOn: $haptics)
                }
                Section("How to play") {
                    rule("Make words", "Lay tiles in a crossword grid. Every run of two or more letters must be a word, across and down.")
                    rule("Peel", "When your hand is empty and every word is valid, tap Peel to draw. In Practice and online games, everyone draws.")
                    rule("Dump", "Stuck with a tile? Select it and tap Dump to swap it for two from the pile.")
                    rule("Finish", "When the pile can't deal everyone a tile and your board uses all of yours, tap Finish. First valid board wins.")
                    rule("Controls", "Tap a tile, then tap the board to place it. Tap a placed tile twice to pick it back up. You can also drag tiles, and pinch to zoom.")
                }
                Section("About") {
                    NavigationLink("Word list notice") { LicenseView() }
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "")
                }
            }
            .navigationTitle("Settings")
            .toolbar { Button("Done") { dismiss() } }
        }
    }

    private func rule(_ title: String, _ text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.headline)
            Text(text).font(.subheadline).foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

private struct LicenseView: View {
    private let text: String = Bundle.main.url(forResource: "ESDB-Copyright", withExtension: "txt")
        .flatMap { try? String(contentsOf: $0, encoding: .utf8) } ?? ""

    var body: some View {
        ScrollView {
            Text("Narnigrams' dictionary is generated from the English Speller Database (ESDB), formerly SCOWL.\n\n" + text)
                .font(.footnote)
                .textSelection(.enabled)
                .padding()
        }
        .navigationTitle("Word list")
        .navigationBarTitleDisplayMode(.inline)
    }
}
