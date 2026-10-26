import GameKit
import Observation
import UIKit

/// Game Center sign-in, leaderboards and achievements.
@MainActor @Observable
final class GameCenter {
    private(set) var isAuthenticated = false
    private(set) var playerName = ""
    private(set) var authError: String?

    func authenticate() {
        GKLocalPlayer.local.authenticateHandler = { [weak self] controller, error in
            Task { @MainActor in
                guard let self else { return }
                if let controller {
                    UIApplication.shared.topViewController?.present(controller, animated: true)
                    return
                }
                self.isAuthenticated = GKLocalPlayer.local.isAuthenticated
                self.playerName = GKLocalPlayer.local.displayName
                self.authError = error?.localizedDescription
                GKAccessPoint.shared.location = .topLeading
            }
        }
    }

    func setAccessPoint(visible: Bool) {
        GKAccessPoint.shared.isActive = visible && isAuthenticated
    }

    func show(_ state: GKGameCenterViewControllerState) {
        guard isAuthenticated else { authenticate(); return }
        GKAccessPoint.shared.trigger(state: state) {}
    }

    // MARK: Reporting

    func report(session: GameSession, stats: StatsStore) {
        guard isAuthenticated else { return }
        let won = session.outcome == .won
        var leaderboards: [(String, Int)] = []
        var achievements: [String: Double] = [:]

        if won {
            achievements[AchievementID.firstWin] = 100
            achievements[AchievementID.wins10] = min(100, Double(stats.wins) * 10)
            achievements[AchievementID.wins50] = min(100, Double(stats.wins) * 2)
            achievements[AchievementID.wins100] = min(100, Double(stats.wins))
            leaderboards.append((LeaderboardID.totalWins, stats.wins))
            if stats.currentStreak >= 5 { achievements[AchievementID.streak5] = 100 }

            let words = session.placedWords
            if words.contains(where: { $0.count >= 7 }) { achievements[AchievementID.word7] = 100 }
            if words.contains(where: { $0.count >= 10 }) { achievements[AchievementID.word10] = 100 }
            let letters = Set(session.board.values.map(\.letter))
            if letters.isSuperset(of: ["J", "Q", "X", "Z"]) { achievements[AchievementID.heavyHitters] = 100 }

            switch session.mode {
            case .solo(let length):
                // Elapsed-time leaderboards are scored in hundredths of a second.
                leaderboards.append((LeaderboardID.fastest(length), Int(session.elapsed * 100)))
                if length == .short && session.elapsed < 90 { achievements[AchievementID.shortUnder90] = 100 }
                if length == .medium && session.elapsed < 180 { achievements[AchievementID.mediumUnder180] = 100 }
                if length == .long { achievements[AchievementID.marathon] = 100 }
                if length != .short && session.dumps == 0 { achievements[AchievementID.noDump] = 100 }
            case .practice(let level):
                achievements[AchievementID.beatBot(level)] = 100
            case .online:
                achievements[AchievementID.firstOnlineWin] = 100
                leaderboards.append((LeaderboardID.onlineWins, stats.onlineWins))
                if session.opponents.count >= 3 { achievements[AchievementID.fullTable] = 100 }
            }
        }
        if session.mode == .online {
            achievements[AchievementID.online10] = min(100, Double(stats.onlineGames) * 10)
        }

        for (id, score) in leaderboards {
            GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { _ in }
        }
        let reports = achievements.filter { $0.value > 0 }.map { id, percent -> GKAchievement in
            let a = GKAchievement(identifier: id)
            a.percentComplete = percent
            a.showsCompletionBanner = percent >= 100
            return a
        }
        if !reports.isEmpty { GKAchievement.report(reports) { _ in } }
    }
}

extension UIApplication {
    var topViewController: UIViewController? {
        let scene = connectedScenes.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
            ?? connectedScenes.compactMap { $0 as? UIWindowScene }.first
        var top = scene?.keyWindow?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}
