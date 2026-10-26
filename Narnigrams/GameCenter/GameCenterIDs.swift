import Foundation

/// These IDs must match what's configured in App Store Connect › Game Center.
/// The full table with titles, descriptions and point values is in GAMECENTER.md.
enum LeaderboardID {
    static func fastest(_ length: GameLength) -> String { "narnigrams.fastest.\(length.rawValue)" }
    static let onlineWins = "narnigrams.wins.online"
    static let totalWins = "narnigrams.wins.total"
}

enum AchievementID {
    static let firstWin = "narnigrams.first_win"
    static let firstOnlineWin = "narnigrams.first_online_win"
    static let shortUnder90 = "narnigrams.speed.short_90"
    static let mediumUnder180 = "narnigrams.speed.medium_180"
    static let marathon = "narnigrams.marathon"
    static let noDump = "narnigrams.no_dump"
    static let word7 = "narnigrams.word_7"
    static let word10 = "narnigrams.word_10"
    static func beatBot(_ level: BotLevel) -> String { "narnigrams.beat_bot.\(level.rawValue)" }
    static let streak5 = "narnigrams.streak_5"
    static let wins10 = "narnigrams.wins_10"
    static let wins50 = "narnigrams.wins_50"
    static let wins100 = "narnigrams.wins_100"
    static let online10 = "narnigrams.online_10"
    static let heavyHitters = "narnigrams.heavy_hitters"
    static let fullTable = "narnigrams.full_table"
}
