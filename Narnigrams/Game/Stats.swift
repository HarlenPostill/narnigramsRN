import Foundation
import Observation

struct GameRecord: Codable, Identifiable {
    var id = UUID()
    var date: Date
    var mode: String
    var won: Bool
    var seconds: Double
    var tilesPlaced: Int
}

/// Local history. Game Center holds the public leaderboards and achievements.
@MainActor @Observable
final class StatsStore {
    private(set) var records: [GameRecord] = []
    private(set) var currentStreak = 0
    private(set) var bestStreak = 0
    private let key = "stats.v2"

    init() {
        if let data = UserDefaults.standard.data(forKey: key),
           let saved = try? JSONDecoder().decode(Saved.self, from: data) {
            records = saved.records
            currentStreak = saved.currentStreak
            bestStreak = saved.bestStreak
        }
    }

    var wins: Int { records.filter(\.won).count }
    var onlineWins: Int { records.filter { $0.won && $0.mode == "online" }.count }
    var onlineGames: Int { records.filter { $0.mode == "online" }.count }

    func best(for mode: String) -> Double? {
        records.filter { $0.won && $0.mode == mode }.map(\.seconds).min()
    }

    func record(_ r: GameRecord) {
        records.insert(r, at: 0)
        if records.count > 200 { records.removeLast(records.count - 200) }
        currentStreak = r.won ? currentStreak + 1 : 0
        bestStreak = max(bestStreak, currentStreak)
        if let data = try? JSONEncoder().encode(Saved(records: records, currentStreak: currentStreak, bestStreak: bestStreak)) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private struct Saved: Codable {
        var records: [GameRecord]
        var currentStreak: Int
        var bestStreak: Int
    }
}

extension GameMode {
    var statsKey: String {
        switch self {
        case .solo(let l): "solo.\(l.rawValue)"
        case .practice(let b): "practice.\(b.rawValue)"
        case .online: "online"
        }
    }
    var title: String {
        switch self {
        case .solo(let l): "Solo · \(l.title)"
        case .practice(let b): "Practice · \(b.title) bot"
        case .online: "Online match"
        }
    }
}
