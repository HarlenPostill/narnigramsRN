import SwiftUI

struct StatsView: View {
    @Environment(StatsStore.self) private var stats
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    LabeledContent("Games played", value: "\(stats.records.count)")
                    LabeledContent("Wins", value: "\(stats.wins)")
                    LabeledContent("Current streak", value: "\(stats.currentStreak)")
                    LabeledContent("Best streak", value: "\(stats.bestStreak)")
                }
                Section("Best solo times") {
                    ForEach(GameLength.allCases) { length in
                        LabeledContent(length.title, value: stats.best(for: GameMode.solo(length).statsKey)
                            .map { Duration.seconds($0).formatted(.time(pattern: .minuteSecond)) } ?? "—")
                    }
                }
                Section("Recent games") {
                    if stats.records.isEmpty {
                        Text("Finish a game to see it here.").foregroundStyle(.secondary)
                    }
                    ForEach(stats.records.prefix(30)) { r in
                        HStack {
                            Image(systemName: r.won ? "checkmark.circle.fill" : "xmark.circle")
                                .foregroundStyle(r.won ? Color.accentColor : .secondary)
                            VStack(alignment: .leading) {
                                Text(label(for: r.mode))
                                Text(r.date, style: .date).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(Duration.seconds(r.seconds), format: .time(pattern: .minuteSecond)).monospacedDigit()
                        }
                    }
                }
            }
            .navigationTitle("Stats")
            .toolbar { Button("Done") { dismiss() } }
        }
    }

    private func label(for key: String) -> String {
        let parts = key.split(separator: ".").map { $0.capitalized }
        return parts.count == 2 ? "\(parts[0]) · \(parts[1])" : parts.joined()
    }
}
