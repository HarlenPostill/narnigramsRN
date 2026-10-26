import GameKit
import Observation
import UIKit

/// Real-time Game Center match for 2–4 players.
///
/// Every device builds the same tile pool from the host's seed, so messages only carry tile ids.
/// The host (lowest gamePlayerID) owns the draw pile and orders peels, dumps and the finish claim.
@MainActor @Observable
final class OnlineMatch: NSObject {
    enum Phase: Equatable {
        case idle
        case waitingForHost
        case playing
        case failed(String)
    }

    private(set) var phase: Phase = .idle
    private(set) var session: GameSession?

    private var match: GKMatch?
    private var words: WordList?
    private var hostID = ""
    private var order: [String] = []
    private var names: [String: String] = [:]
    private var pile: [Int] = []
    private var winner: String?

    private var me: String { GKLocalPlayer.local.gamePlayerID }
    private var isHost: Bool { hostID == me }

    private enum Message: Codable {
        case start(seed: UInt64, poolSize: Int, handSize: Int, order: [String], names: [String: String])
        case peelRequest
        case dumpRequest(tileID: Int)
        case finishClaim
        case peel(dealt: [String: Int], pileCount: Int)
        case dump(player: String, drawn: [Int], pileCount: Int)
        case finished(winner: String)
        case progress(placed: Int, inHand: Int)
    }

    func listenForInvites(words: WordList) {
        self.words = words
        GKLocalPlayer.local.register(self)
    }

    func findMatch(words: WordList) {
        self.words = words
        let request = GKMatchRequest()
        request.minPlayers = 2
        request.maxPlayers = 4
        request.inviteMessage = "Race me in Narnigrams."
        guard let vc = GKMatchmakerViewController(matchRequest: request) else { return }
        present(vc)
    }

    private func present(_ vc: GKMatchmakerViewController) {
        vc.matchmakerDelegate = self
        vc.canStartWithMinimumPlayers = true
        UIApplication.shared.topViewController?.present(vc, animated: true)
    }

    func leave() {
        match?.disconnect()
        match?.delegate = nil
        match = nil
        session?.cancel()
        session = nil
        phase = .idle
        winner = nil
    }

    // MARK: Setup

    private func begin(_ match: GKMatch) {
        self.match = match
        match.delegate = self
        let everyone = [GKLocalPlayer.local] + match.players
        names = Dictionary(uniqueKeysWithValues: everyone.map { ($0.gamePlayerID, $0.displayName) })
        order = everyone.map(\.gamePlayerID).sorted()
        hostID = order[0]
        phase = .waitingForHost
        guard isHost else { return }
        // Larger tables get the long pool so everyone can be dealt in.
        let poolSize = order.count > 2 ? GameLength.long.poolSize : GameLength.medium.poolSize
        let start = Message.start(seed: .random(in: 1...UInt64.max), poolSize: poolSize, handSize: GameLength.medium.handSize, order: order, names: names)
        broadcast(start)
        apply(start)
    }

    // MARK: Messaging

    private func broadcast(_ message: Message, reliable: Bool = true) {
        guard let match, let data = try? JSONEncoder().encode(message) else { return }
        try? match.sendData(toAllPlayers: data, with: reliable ? .reliable : .unreliable)
    }

    private func sendToHost(_ message: Message) {
        if isHost { handleRequest(message, from: me); return }
        guard let match, let host = match.players.first(where: { $0.gamePlayerID == hostID }),
              let data = try? JSONEncoder().encode(message) else { return }
        try? match.send(data, to: [host], dataMode: .reliable)
    }

    private func receive(_ data: Data, from player: String) {
        guard let message = try? JSONDecoder().decode(Message.self, from: data) else { return }
        switch message {
        case .peelRequest, .dumpRequest, .finishClaim:
            if isHost { handleRequest(message, from: player) }
        case .progress(let placed, let inHand):
            session?.updateOpponent(player, placed: placed, inHand: inHand)
        case .start, .peel, .dump, .finished:
            // Only the host's word counts for authoritative events.
            if player == hostID { apply(message) }
        }
    }

    /// Host only: mutate the real pile, then broadcast the result to everyone (including ourselves).
    private func handleRequest(_ message: Message, from player: String) {
        guard winner == nil else { return }
        let event: Message
        switch message {
        case .peelRequest:
            guard pile.count >= order.count else { return }
            var dealt: [String: Int] = [:]
            for id in order { dealt[id] = pile.removeFirst() }
            event = .peel(dealt: dealt, pileCount: pile.count)
        case .dumpRequest(let tileID):
            guard pile.count >= 2 else { return }
            pile.append(tileID)
            let drawn = Array(pile.prefix(2))
            pile.removeFirst(2)
            event = .dump(player: player, drawn: drawn, pileCount: pile.count)
        case .finishClaim:
            guard pile.count < order.count else { return }
            event = .finished(winner: player)
        default:
            return
        }
        broadcast(event)
        apply(event)
    }

    private func apply(_ message: Message) {
        switch message {
        case let .start(seed, poolSize, handSize, order, names):
            guard let words else { return }
            self.order = order
            self.names = names
            pile = Array((order.count * handSize)..<poolSize)
            let s = GameSession(onlineSeed: seed, poolSize: poolSize, handSize: handSize, order: order, me: me, names: names, words: words)
            s.authority = self
            session = s
            phase = .playing
        case let .peel(dealt, pileCount):
            if let mine = dealt[me] { session?.receive(tileIDs: [mine]) }
            session?.setPileCount(pileCount)
        case let .dump(player, drawn, pileCount):
            if player == me { session?.receive(tileIDs: drawn) }
            session?.setPileCount(pileCount)
        case let .finished(winner):
            self.winner = winner
            session?.finish(winner == me ? .won : .lost(winner: names[winner] ?? "Another player"))
        default:
            break
        }
    }

    private func playerLeft(_ id: String) {
        session?.markDisconnected(id)
        guard let session, !session.isOver else { return }
        if session.opponents.allSatisfy({ !$0.connected }) {
            session.finish(.won)
        } else if id == hostID {
            session.finish(.abandoned(reason: "The host left the match."))
        }
    }
}

extension OnlineMatch: OnlinePileAuthority {
    func requestPeel() { sendToHost(.peelRequest) }
    func requestDump(tileID: Int) { sendToHost(.dumpRequest(tileID: tileID)) }
    func claimFinish() { sendToHost(.finishClaim) }
    func reportProgress(placed: Int, inHand: Int) { broadcast(.progress(placed: placed, inHand: inHand), reliable: false) }
}

extension OnlineMatch: GKMatchmakerViewControllerDelegate {
    nonisolated func matchmakerViewControllerWasCancelled(_ viewController: GKMatchmakerViewController) {
        Task { @MainActor in viewController.dismiss(animated: true) }
    }

    nonisolated func matchmakerViewController(_ viewController: GKMatchmakerViewController, didFailWithError error: Error) {
        let text = error.localizedDescription
        Task { @MainActor in
            viewController.dismiss(animated: true)
            self.phase = .failed(text)
        }
    }

    nonisolated func matchmakerViewController(_ viewController: GKMatchmakerViewController, didFind match: GKMatch) {
        Task { @MainActor in
            viewController.dismiss(animated: true)
            self.begin(match)
        }
    }
}

extension OnlineMatch: GKMatchDelegate {
    nonisolated func match(_ match: GKMatch, didReceive data: Data, fromRemotePlayer player: GKPlayer) {
        let id = player.gamePlayerID
        Task { @MainActor in self.receive(data, from: id) }
    }

    nonisolated func match(_ match: GKMatch, player: GKPlayer, didChange state: GKPlayerConnectionState) {
        guard state == .disconnected else { return }
        let id = player.gamePlayerID
        Task { @MainActor in self.playerLeft(id) }
    }
}

extension OnlineMatch: GKLocalPlayerListener {
    nonisolated func player(_ player: GKPlayer, didAccept invite: GKInvite) {
        Task { @MainActor in
            guard let vc = GKMatchmakerViewController(invite: invite) else { return }
            self.present(vc)
        }
    }
}
