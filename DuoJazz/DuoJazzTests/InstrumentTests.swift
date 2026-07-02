//
//  InstrumentTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@MainActor
@Suite("Instrument")
struct InstrumentTests {

    @Test("Piano has zero concert MIDI offset")
    func pianoConcertOffset() {
        #expect(Instrument.piano.concertMidiOffset == 0)
        #expect(Instrument.piano.transposition == .c)
    }

    @Test("Bb instruments sound lower than written")
    func bbTransposition() {
        #expect(Instrument.trumpet.concertMidiOffset == -2)
        #expect(Instrument.trumpet.concertKey(from: .c) == .aSharp)
        #expect(Instrument.trumpet.writtenKey(from: .c) == .d)
    }

    @Test("Eb alto sax sounds higher than written")
    func ebTransposition() {
        #expect(Instrument.altoSax.concertMidiOffset == 3)
        #expect(Instrument.altoSax.concertKey(from: .c) == .dSharp)
        #expect(Instrument.altoSax.writtenKey(from: .c) == .a)
    }

    @Test("Recommended octave offset centers lick in range")
    func recommendedOctaveOffset() {
        let lowLick = Lick(
            id: "low",
            name: "Low",
            elements: [N(-12), N(-8)]
        )
        let offset = Instrument.flute.recommendedOctaveOffset(for: lowLick, in: .c)
        #expect(offset >= 1)

        let highLick = Lick(
            id: "high",
            name: "High",
            elements: [N(24), N(28)]
        )
        let downOffset = Instrument.flute.recommendedOctaveOffset(for: highLick, in: .c)
        #expect(downOffset <= -1)
    }

    @Test("Empty lick returns zero octave offset")
    func emptyLickOffset() {
        let restOnly = Lick(id: "rests", name: "Rests", elements: [R(.whole)])
        #expect(Instrument.piano.recommendedOctaveOffset(for: restOnly, in: .c) == 0)
    }

    @Test("isInRange respects instrument limits")
    func rangeCheck() {
        let lowLick = Lick(id: "low", name: "Low", elements: [N(-5), N(-2)])
        #expect(Instrument.flute.isInRange(lick: lowLick, in: .c, octaveOffset: 0) == false)
        #expect(Instrument.flute.isInRange(lick: lowLick, in: .c, octaveOffset: 1))

        let midLick = Lick(id: "mid", name: "Mid", elements: [N(0), N(4), N(7)])
        #expect(Instrument.piano.isInRange(lick: midLick, in: .c, octaveOffset: 0))
    }

    @Test("All presets have unique ids")
    func presetIds() {
        let ids = Instrument.allPresets.map(\.id)
        #expect(Set(ids).count == ids.count)
    }
}
