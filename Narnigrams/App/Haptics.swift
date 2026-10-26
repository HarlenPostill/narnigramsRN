import UIKit

@MainActor
enum Haptics {
    static var enabled: Bool { UserDefaults.standard.object(forKey: "haptics") as? Bool ?? true }

    static func tap() { guard enabled else { return }; UISelectionFeedbackGenerator().selectionChanged() }
    static func place() { guard enabled else { return }; UIImpactFeedbackGenerator(style: .soft).impactOccurred() }
    static func pickUp() { guard enabled else { return }; UIImpactFeedbackGenerator(style: .light).impactOccurred(intensity: 0.8) }
    static func hover() { guard enabled else { return }; UISelectionFeedbackGenerator().selectionChanged() }
    static func success() { guard enabled else { return }; UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func error() { guard enabled else { return }; UINotificationFeedbackGenerator().notificationOccurred(.error) }
}
