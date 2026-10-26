import Foundation
import Observation

/// Loads the bundled ESDB-derived dictionary off the main thread.
@MainActor @Observable
final class WordList {
    private(set) var words: Set<String> = []
    private(set) var botWords: [String] = []
    var isLoaded: Bool { !words.isEmpty }

    func load() async {
        guard words.isEmpty else { return }
        let loaded = await Task.detached(priority: .userInitiated) { () -> (Set<String>, [String]) in
            guard let url = Bundle.main.url(forResource: "words", withExtension: "txt"),
                  let text = try? String(contentsOf: url, encoding: .utf8) else { return ([], []) }
            var set = Set<String>(minimumCapacity: 200_000)
            var bot: [String] = []
            for line in text.split(separator: "\n") {
                let word = line.trimmingCharacters(in: .whitespaces).uppercased()
                guard word.count >= 2 else { continue }
                set.insert(word)
                if word.count <= 12 { bot.append(word) }
            }
            bot.sort { $0.count != $1.count ? $0.count > $1.count : $0 < $1 }
            return (set, bot)
        }.value
        words = loaded.0
        botWords = loaded.1
    }
}
