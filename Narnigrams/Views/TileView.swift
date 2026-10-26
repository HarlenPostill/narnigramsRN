import SwiftUI

extension Color {
    static let tileFace = Color("TileFace")
    static let tileInk = Color("TileInk")
    static let felt = Color("Felt")
}

/// The one loud element in the app: a chunky maple tile, lifted from the app icon.
struct TileView: View {
    let letter: Character
    var size: CGFloat = 44
    var isSelected = false
    var isInvalid = false
    var tilt: Double = 0

    private var radius: CGFloat { size * 0.22 }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(Color.tileFace.shadow(.inner(color: .white.opacity(0.55), radius: size * 0.04, x: -size * 0.03, y: -size * 0.03))
                    .shadow(.inner(color: .black.opacity(0.18), radius: size * 0.05, x: size * 0.03, y: size * 0.04)))
            if isInvalid {
                RoundedRectangle(cornerRadius: radius, style: .continuous).fill(Color.red.opacity(0.32))
            }
            Text(String(letter))
                .font(.system(size: size * 0.56, weight: .heavy, design: .rounded))
                .foregroundStyle(Color.tileInk)
                .offset(y: -size * 0.015)
        }
        .frame(width: size, height: size)
        .overlay {
            if isSelected {
                RoundedRectangle(cornerRadius: radius + 3, style: .continuous)
                    .strokeBorder(Color.accentColor, lineWidth: 3)
                    .padding(-4)
            }
        }
        .shadow(color: .black.opacity(isSelected ? 0.3 : 0.18), radius: isSelected ? 6 : 1.5, y: isSelected ? 4 : 1.5)
        .scaleEffect(isSelected ? 1.06 : 1)
        .rotationEffect(.degrees(tilt))
        .animation(.spring(duration: 0.25), value: isSelected)
        .accessibilityElement()
        .accessibilityLabel(Text(String(letter)))
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }
}

/// A word spelled in tiles with a hand-placed scatter, used as the app's logotype.
struct TileWord: View {
    let word: String
    var size: CGFloat = 34

    var body: some View {
        HStack(spacing: size * 0.08) {
            ForEach(Array(word.enumerated()), id: \.offset) { i, ch in
                TileView(letter: ch, size: size, tilt: [-4, 3, -2, 5, -3, 2, -5, 3, -2, 4][i % 10])
                    .offset(y: [0, -3, 2, -1, 3, -2, 1, -3, 2, 0][i % 10])
            }
        }
        .accessibilityElement()
        .accessibilityLabel(word.capitalized)
    }
}

#Preview {
    VStack(spacing: 24) {
        TileWord(word: "NARNIGRAMS")
        HStack { TileView(letter: "Q", isSelected: true); TileView(letter: "Z", isInvalid: true) }
    }
    .padding()
    .background(Color.felt)
}
