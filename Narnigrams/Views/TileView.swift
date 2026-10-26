import SwiftUI

extension Color {
    static let tileFace = Color("TileFace")
    static let tileInk = Color("TileInk")
    static let felt = Color("Felt")

    // Tile body tones. Fixed rather than adaptive: a physical tile doesn't change colour at night.
    static let tileTop = Color(red: 0.992, green: 0.906, blue: 0.784)
    static let tileBottom = Color(red: 0.945, green: 0.800, blue: 0.616)
    static let tileSide = Color(red: 0.780, green: 0.600, blue: 0.400)
    static let tileEdge = Color(red: 0.560, green: 0.400, blue: 0.240)
}

/// The one loud element in the app: a thick maple tile with a bevelled face and an engraved letter.
///
/// Layers, bottom to top: contact and ambient shadows, the side wall (gives thickness),
/// the face gradient, a top-left bevel highlight, a bottom-right inner shade, a hairline
/// edge stroke, then the letter pressed into the face.
struct TileView: View {
    let letter: Character
    var size: CGFloat = 44
    var isSelected = false
    var isInvalid = false
    var isLifted = false
    var tilt: Double = 0

    private var radius: CGFloat { size * 0.2 }
    private var depth: CGFloat { max(2, size * 0.075) }
    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: radius, style: .continuous) }

    var body: some View {
        ZStack(alignment: .top) {
            // Side wall, peeking out below the face.
            shape
                .fill(LinearGradient(colors: [.tileSide, .tileEdge], startPoint: .top, endPoint: .bottom))
                .overlay(shape.strokeBorder(Color.tileEdge.opacity(0.7), lineWidth: 0.75))
                .offset(y: depth)

            face
        }
        .frame(width: size, height: size)
        .padding(.bottom, depth)
        .compositingGroup()
        // Contact shadow plus a softer ambient one; both grow when the tile is picked up.
        .shadow(color: .black.opacity(isLifted ? 0.18 : 0.22), radius: isLifted ? 2 : 0.5, y: isLifted ? 3 : 1)
        .shadow(color: .black.opacity(isLifted ? 0.28 : 0.12), radius: isLifted ? 14 : 3, y: isLifted ? 14 : 2)
        .overlay(alignment: .top) {
            if isSelected {
                shape
                    .strokeBorder(Color.accentColor, lineWidth: max(2, size * 0.06))
                    .frame(width: size + 6, height: size + 6)
                    .offset(y: -3)
            }
        }
        .scaleEffect(isLifted ? 1.14 : 1)
        .rotationEffect(.degrees(isLifted ? 0 : tilt))
        .animation(.spring(response: 0.22, dampingFraction: 0.72), value: isLifted)
        .animation(.spring(response: 0.25, dampingFraction: 0.8), value: isSelected)
        .accessibilityElement()
        .accessibilityLabel(Text(String(letter)))
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }

    private var face: some View {
        ZStack {
            shape.fill(LinearGradient(colors: [.tileTop, .tileBottom], startPoint: .top, endPoint: .bottom))

            // Bevel: light catches the top-left lip, the bottom-right lip falls into shade.
            shape.fill(
                Color.clear
                    .shadow(.inner(color: .white.opacity(0.85), radius: size * 0.02, x: size * 0.025, y: size * 0.035))
                    .shadow(.inner(color: Color.tileSide.opacity(0.55), radius: size * 0.05, x: -size * 0.02, y: -size * 0.045))
            )

            // A broad, faint sheen across the upper face.
            shape
                .fill(LinearGradient(colors: [.white.opacity(0.35), .clear], startPoint: .top, endPoint: .center))
                .padding(size * 0.08)
                .blur(radius: size * 0.04)

            if isInvalid {
                shape.fill(Color.red.opacity(0.28))
                    .overlay(shape.strokeBorder(Color.red.opacity(0.85), lineWidth: max(1.5, size * 0.045)))
            }

            // Engraved letter: dark ink with an inner shade, and a highlight on its lower lip.
            Text(String(letter))
                .font(.system(size: size * 0.56, weight: .heavy, design: .rounded))
                .foregroundStyle(
                    Color.tileInk.shadow(.inner(color: .black.opacity(0.6), radius: size * 0.012, y: size * 0.015))
                )
                .shadow(color: .white.opacity(0.7), radius: 0, y: max(0.5, size * 0.018))
                .offset(y: -size * 0.01)
        }
        .clipShape(shape)
        // Hairline edge: darker outer line with a bright inner rim just inside it.
        .overlay(shape.strokeBorder(Color.tileEdge.opacity(0.55), lineWidth: 0.75))
        .overlay(
            shape
                .inset(by: 1)
                .stroke(LinearGradient(colors: [.white.opacity(0.9), .white.opacity(0.1)], startPoint: .top, endPoint: .bottom), lineWidth: 0.75)
        )
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
    VStack(spacing: 32) {
        TileWord(word: "NARNIGRAMS")
        HStack(spacing: 20) {
            TileView(letter: "Q", size: 64)
            TileView(letter: "W", size: 64, isSelected: true)
            TileView(letter: "Z", size: 64, isInvalid: true)
            TileView(letter: "A", size: 64, isLifted: true)
        }
    }
    .padding()
    .background(Color.felt)
}
