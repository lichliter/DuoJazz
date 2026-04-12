//
//  ProfileViewModel.swift
//  DuoJazz
//

import Foundation
import SwiftData

@Observable
class ProfileViewModel {
    var selectedInstrument: Instrument

    var transpositionDisplay: String {
        KeyOption.allOptions.first { $0.key == selectedInstrument.transposition }?.displayName ?? "C"
    }

    init(instrument: Instrument = .altoSax) {
        self.selectedInstrument = instrument
    }

    func updateInstrument(_ instrument: Instrument, profile: UserProfile) {
        selectedInstrument = instrument
        profile.instrumentId = instrument.id
    }
}
